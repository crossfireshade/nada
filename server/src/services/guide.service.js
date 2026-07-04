const Guide = require('../models/Guide');
const Segment = require('../models/Segment');
const EntryPermission = require('../models/EntryPermission');
const EntryPermissionGuest = require('../models/EntryPermissionGuest');
const GuideOccurrence = require('../models/GuideOccurrence');
const alertService = require('./alert.service');
const { getPagination, getSort } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');

const TRANSITIONS = {
  DRAFT: 'SUBMITTED',
  SUBMITTED: 'APPROVED',
  APPROVED: 'FINAL_PUBLISHED',
  FINAL_PUBLISHED: 'LIVE_IN_PROGRESS',
  LIVE_IN_PROGRESS: 'LIVE_STOPPED',
  LIVE_STOPPED: 'ARCHIVED',
};

const transition = async (guideId, action, userId, reason) => {
  const guide = await Guide.findById(guideId);
  if (!guide) throw Object.assign(new Error('Guide not found'), { statusCode: 404 });

  const actionMap = {
    submit: { from: ['DRAFT', 'REJECTED'], to: 'SUBMITTED', dateField: 'submittedAt' },
    approve: { from: 'SUBMITTED', to: 'APPROVED', dateField: 'approvedAt' },
    publish: { from: 'APPROVED', to: 'FINAL_PUBLISHED', dateField: 'publishedAt' },
    validate: { from: 'SUBMITTED', to: 'FINAL_PUBLISHED', dateField: 'publishedAt' },
    reject: { from: 'SUBMITTED', to: 'REJECTED', dateField: null },
    'start-live': { from: 'FINAL_PUBLISHED', to: 'LIVE_IN_PROGRESS', dateField: 'liveStartedAt' },
    'stop-live': { from: 'LIVE_IN_PROGRESS', to: 'LIVE_STOPPED', dateField: 'liveStoppedAt' },
    'restart-live': { from: 'LIVE_STOPPED', to: 'LIVE_IN_PROGRESS', dateField: null },
    archive: { from: 'LIVE_STOPPED', to: 'ARCHIVED', dateField: 'archivedAt' },
  };

  const t = actionMap[action];
  if (!t) throw Object.assign(new Error('Unknown action'), { statusCode: 400 });
  const validFrom = Array.isArray(t.from) ? t.from : [t.from];
  if (!validFrom.includes(guide.status)) {
    throw Object.assign(
      new Error(`Cannot ${action} guide in status ${guide.status}`),
      { statusCode: 422 }
    );
  }

  // Server-side validation: block submit if telephone guest has no photo
  if (action === 'submit') {
    const telephoneWithoutPhoto = await Segment.find({
      guideId: guide._id,
      guestAttendanceMode: 'TELEPHONE',
      guestFullName: { $ne: '' },
      $or: [{ guestPhotoUrl: '' }, { guestPhotoUrl: { $exists: false } }],
    }).lean();
    const missingPhotos = telephoneWithoutPhoto.filter(s => s.guestFullName && s.guestFullName.trim());
    if (missingPhotos.length > 0) {
      throw Object.assign(
        new Error('Photo obligatoire pour les invités par téléphone'),
        { statusCode: 422 }
      );
    }

    // Non-blocking: check for duplicate guests in other guides on same day
    setImmediate(async () => {
      try {
        const conflicts = await findGuestConflicts(guide._id, guide.broadcastDate);
        for (const c of conflicts) {
          const params = { guestName: c.guestName, programTitle: c.programTitle };
          // Alert the producer
          await alertService.createOrSkipAlert({
            severity: 'WARNING',
            messageKey: 'notifications.guestAlreadyInProgram',
            params,
            targetUserId: userId,
            relatedEntityType: 'Guide',
            relatedEntityId: guide._id,
            dedupeKey: `guest_conflict:${guide._id}:${c.guestName}:${c.programTitle}`,
          });
          // Alert Responsable Production
          await alertService.createOrSkipAlert({
            severity: 'WARNING',
            messageKey: 'notifications.guestAlreadyInProgram',
            params,
            targetRole: ROLES.RESPONSABLE_PRODUCTION,
            relatedEntityType: 'Guide',
            relatedEntityId: guide._id,
            dedupeKey: `guest_conflict:${guide._id}:${c.guestName}:${c.programTitle}:prod`,
          });
        }
      } catch (err) {
        console.error('[guide] guest conflict alert error:', err?.message);
      }
    });
  }

  guide.status = t.to;
  if (t.dateField) guide[t.dateField] = new Date();
  if (action === 'approve' || action === 'validate') guide.validatedBy = userId;
  if (action === 'reject') {
    guide.rejectionReason = reason ? reason.trim() : '';
    guide.rejectedAt = new Date();
  }

  await guide.save();

  const programName = guide.programTitle || guide.theme;

  // Auto-create EntryPermission for PRESENT_STUDIO guests when chef de production validates
  if (action === 'validate') {
    try {
      const allSegs = await Segment.find({ guideId: guide._id }).lean();
      const guestsWithName = allSegs.filter(
        s => s.guestFullName && s.guestFullName.trim() !== '' &&
             s.guestAttendanceMode === 'PRESENT_STUDIO'
      );

      if (guestsWithName.length > 0) {
        let ep = await EntryPermission.findOne({ guideId: guide._id });
        if (!ep) {
          ep = await EntryPermission.create({
            guideId: guide._id,
            date: guide.broadcastDate ? new Date(guide.broadcastDate) : new Date(),
            producerName: guide.producerName || '',
            programTitle: guide.programTitle || '',
            startTime: guide.startTime || '',
            endTime: guide.endTime || '',
            createdByUserId: userId,
            sentToReceiverAt: new Date(),
            status: 'PENDING',
          });
        } else {
          ep.sentToReceiverAt = new Date();
          ep.status = 'PENDING';
          ep.producerName = guide.producerName || '';
          ep.programTitle = guide.programTitle || '';
          ep.startTime = guide.startTime || '';
          ep.endTime = guide.endTime || '';
          await ep.save();
          await EntryPermissionGuest.deleteMany({ entryPermissionId: ep._id });
        }
        await EntryPermissionGuest.insertMany(
          guestsWithName.map(seg => ({
            entryPermissionId: ep._id,
            guestName: seg.guestFullName.trim(),
            functionTitle: seg.guestTitleFunction || '',
          }))
        );

        // Notify RECEPTIONNISTE_POLICIER: new entry permission after validation
        await alertService.createOrSkipAlert({
          severity: 'INFO',
          messageKey: 'notifications.newEntryPermissionReceived',
          params: { programName },
          targetRole: ROLES.RECEPTIONNISTE_POLICIER,
          relatedEntityType: 'EntryPermission',
          relatedEntityId: ep._id,
          dedupeKey: `ep_validated:${ep._id}:${guide.publishedAt?.getTime() || Date.now()}`,
        });
      }
    } catch (epErr) {
      console.error('[guide.service] auto-entry-permission error:', epErr?.message, epErr?.stack);
    }
  }

  // Sync occurrence status to mirror guide lifecycle
  if (guide.occurrenceId) {
    const guideToOccStatus = {
      SUBMITTED: 'SUBMITTED',
      REJECTED: 'DRAFT',       // producer must rework → back to draft
      APPROVED: 'VALIDATED',
      FINAL_PUBLISHED: 'VALIDATED',
      LIVE_IN_PROGRESS: 'LIVE',
      LIVE_STOPPED: 'ARCHIVED',
      ARCHIVED: 'ARCHIVED',
    };
    const occStatus = guideToOccStatus[t.to];
    if (occStatus) {
      try {
        await GuideOccurrence.findByIdAndUpdate(guide.occurrenceId, { status: occStatus });
      } catch (occErr) {
        console.error('[guide.service] occurrence sync error:', occErr?.message);
      }
    }
  }

  // Send notifications based on new status
  try {
    if (t.to === 'SUBMITTED') {
      // Notify Responsable Production: new guide submitted
      await alertService.createOrSkipAlert({
        severity: 'INFO',
        messageKey: 'notifications.newGuideSubmitted',
        params: { programName },
        targetRole: ROLES.RESPONSABLE_PRODUCTION,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `guide_submitted:${guide._id}:${guide.submittedAt?.toISOString() || Date.now()}`,
      });
    } else if (t.to === 'FINAL_PUBLISHED') {
      // Notify Technicien/Coordinateur: guide final available
      await alertService.createOrSkipAlert({
        severity: 'SUCCESS',
        messageKey: 'notifications.guideFinalAvailable',
        params: { programName },
        targetRole: ROLES.TECHNICIEN_COORDINATEUR,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `guide_final_available:${guide._id}`,
      });
      // Notify Responsable Administratif: new final guide available
      await alertService.createOrSkipAlert({
        severity: 'INFO',
        messageKey: 'notifications.newFinalGuideAvailable',
        params: { programName },
        targetRole: ROLES.RESPONSABLE_ADMINISTRATIF,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `guide_final_available_admin:${guide._id}`,
      });
      // Notify guide creator: guide validated
      if (guide.createdBy) {
        await alertService.createOrSkipAlert({
          severity: 'SUCCESS',
          messageKey: 'notifications.guideValidated',
          params: { programName },
          targetUserId: guide.createdBy,
          relatedEntityType: 'Guide',
          relatedEntityId: guide._id,
          dedupeKey: `guide_validated:${guide._id}`,
        });
      }
    } else if (t.to === 'REJECTED') {
      // Notify guide creator: guide needs correction
      if (guide.createdBy) {
        await alertService.createOrSkipAlert({
          severity: 'WARNING',
          messageKey: 'notifications.guideToCorrect',
          params: { programName },
          targetUserId: guide.createdBy,
          relatedEntityType: 'Guide',
          relatedEntityId: guide._id,
          dedupeKey: `guide_rejected:${guide._id}:${Date.now()}`,
        });
      }
    } else if (t.to === 'ARCHIVED') {
      // Notify Responsable Administratif: archive available
      await alertService.createOrSkipAlert({
        severity: 'INFO',
        messageKey: 'notifications.archiveAvailable',
        params: { programName },
        targetRole: ROLES.RESPONSABLE_ADMINISTRATIF,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `guide_archived:${guide._id}`,
      });
    }
  } catch (notifErr) {
    console.error('[guide.service] notification error:', notifErr?.message);
  }

  return guide;
};

const getGuides = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, ['createdAt', 'status', 'version']);

  const filter = {};
  if (query.status) {
    const statuses = String(query.status).split(',').map(s => s.trim()).filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }
  if (query.createdBy) filter.createdBy = query.createdBy;
  if (query.validatedBy) filter.validatedBy = query.validatedBy;
  if (query.occurrenceId) filter.occurrenceId = query.occurrenceId;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setDate(to.getDate() + 1);
      filter.createdAt.$lt = to;
    }
  } else if (query.date) {
    const d = new Date(query.date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.createdAt = { $gte: d, $lt: next };
  }

  // PRODUCTEUR can only see their own guides
  if (user && user.role === ROLES.PRODUCTEUR) {
    filter.createdBy = user._id;
  }

  // Hide other users' DRAFTs and REJECTED unless RESPONSABLE_ADMINISTRATIF
  if (user && user.role !== 'RESPONSABLE_ADMINISTRATIF') {
    const userId = user._id || user.id;
    if (user.role === 'RESPONSABLE_PRODUCTION') {
      // RP sees all REJECTED guides (they are the ones who reject)
      filter.$or = [
        { status: { $nin: ['DRAFT', 'REJECTED'] } },
        { status: 'DRAFT', createdBy: userId },
        { status: 'REJECTED' },
      ];
    } else {
      filter.$or = [
        { status: { $nin: ['DRAFT', 'REJECTED'] } },
        { status: 'DRAFT', createdBy: userId },
        { status: 'REJECTED', createdBy: userId },
      ];
    }
  }

  const [data, total] = await Promise.all([
    Guide.find(filter)
      .populate('createdBy', 'name email role')
      .populate('validatedBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Guide.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

// ── Guest conflict detection ──────────────────────────────────────────────────

const checkSingleGuestConflict = async (guestName, broadcastDate, excludeGuideId) => {
  if (!guestName || !guestName.trim() || !broadcastDate) return null;
  const name = guestName.trim();
  const nameRegex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const query = {
    broadcastDate,
    status: { $nin: ['REJECTED', 'ARCHIVED'] },
  };

  // Fetch current guide's creation time to determine who is "first"
  let thisGuideCreatedAt = null;
  if (excludeGuideId) {
    query._id = { $ne: excludeGuideId };
    const thisGuide = await Guide.findById(excludeGuideId).select('createdAt').lean();
    thisGuideCreatedAt = thisGuide?.createdAt || null;
  }

  const otherGuides = await Guide.find(query).lean();
  if (!otherGuides.length) return null;

  for (const other of otherGuides) {
    const seg = await Segment.findOne({ guideId: other._id, rowType: 'PROGRAMME', guestFullName: nameRegex }).lean();
    if (seg) {
      // Only flag as conflict if THIS guide was created AFTER the other guide.
      // If this guide was created first (or at the same time), it is the "original" — no conflict for it.
      if (thisGuideCreatedAt && other.createdAt && thisGuideCreatedAt <= other.createdAt) {
        continue; // current guide was first → skip, not a conflict for us
      }
      return {
        programTitle: other.programTitle || other.theme || '—',
        startTime: other.startTime || '',
        endTime: other.endTime || '',
      };
    }
  }
  return null;
};

const findGuestConflicts = async (guideId, broadcastDate) => {
  if (!broadcastDate) return [];

  const thisGuide = await Guide.findById(guideId).select('createdAt').lean();
  const thisCreatedAt = thisGuide?.createdAt || null;

  const myGuests = await Segment.find({
    guideId,
    rowType: 'PROGRAMME',
    guestFullName: { $exists: true, $ne: '' },
  }).lean();
  if (!myGuests.length) return [];

  const myNames = [...new Set(myGuests.map(s => s.guestFullName.trim().toLowerCase()))];

  const otherGuides = await Guide.find({
    _id: { $ne: guideId },
    broadcastDate,
    status: { $nin: ['REJECTED', 'ARCHIVED'] },
  }).lean();
  if (!otherGuides.length) return [];

  const conflicts = [];
  for (const other of otherGuides) {
    // Only flag conflict if current guide was created AFTER the other guide (current = second)
    if (thisCreatedAt && other.createdAt && thisCreatedAt <= other.createdAt) continue;

    const otherSegs = await Segment.find({
      guideId: other._id,
      rowType: 'PROGRAMME',
      guestFullName: { $exists: true, $ne: '' },
    }).lean();
    for (const seg of otherSegs) {
      if (myNames.includes(seg.guestFullName.trim().toLowerCase())) {
        conflicts.push({
          guestName: seg.guestFullName.trim(),
          programTitle: other.programTitle || other.theme || '—',
          startTime: other.startTime || '',
          endTime: other.endTime || '',
        });
      }
    }
  }
  return conflicts;
};

module.exports = { transition, getGuides, findGuestConflicts, checkSingleGuestConflict, TRANSITIONS };

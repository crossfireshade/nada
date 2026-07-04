const mongoose = require('mongoose');

const OCCURRENCE_STATUSES = ['PLANNED', 'DRAFT', 'SUBMITTED', 'LATE', 'VALIDATED', 'LIVE', 'ARCHIVED', 'DISABLED'];

const guideOccurrenceSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringGuide', required: true },
    programName: { type: String, default: '' },
    weekday: { type: Number }, // 0=Mon … 6=Sun
    scheduledDate: { type: Date, required: true }, // broadcast date (day)
    startTime: { type: String, default: '' },       // "09:00"
    endTime: { type: String, default: '' },         // "10:00"
    broadcastDateTime: { type: Date, required: true }, // scheduled date + startTime
    submissionDeadline: { type: Date, required: true }, // broadcastDateTime - deadlineHours
    submissionDeadlineHours: { type: Number, default: 48 },

    status: { type: String, enum: OCCURRENCE_STATUSES, default: 'PLANNED' },

    producerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productionChiefId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Filled by producer
    notes: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    validatedAt: { type: Date, default: null },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Access control for late occurrences
    accessRequested: { type: Boolean, default: false },
    accessRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    accessGranted: { type: Boolean, default: false },
    accessGrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    accessGrantedAt: { type: Date, default: null },

    // Track reason for DISABLED status
    disabledByTemplate: { type: Boolean, default: false },

    // Reminder tracking
    reminder24hSent: { type: Boolean, default: false },
    reminder6hSent: { type: Boolean, default: false },
    reminder1hSent: { type: Boolean, default: false },
    adminReminder6hSent: { type: Boolean, default: false },
    lateAlertSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

guideOccurrenceSchema.index({ templateId: 1, scheduledDate: 1 }, { unique: true });
guideOccurrenceSchema.index({ producerId: 1, status: 1 });
guideOccurrenceSchema.index({ status: 1, submissionDeadline: 1 });
guideOccurrenceSchema.index({ broadcastDateTime: 1 });

module.exports = mongoose.model('GuideOccurrence', guideOccurrenceSchema);
module.exports.OCCURRENCE_STATUSES = OCCURRENCE_STATUSES;

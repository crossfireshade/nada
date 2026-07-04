const { Router } = require('express');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ROLES } = require('../utils/constants');
const svc = require('../services/recurringGuide.service');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = Router();
router.use(auth);

const ADMIN = [ROLES.RESPONSABLE_ADMINISTRATIF];
const PRODUCERS = [ROLES.PRODUCTEUR, ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF];

// ── Templates (admin only) ────────────────────────────────────────────────────

router.get('/templates', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.getTemplates(req.query, req.user);
    return successResponse(res, data);
  } catch (err) { next(err); }
});

router.post('/templates', rbac(ADMIN), async (req, res, next) => {
  try {
    const template = await svc.createTemplate(req.body, req.user._id);
    return successResponse(res, template);
  } catch (err) { next(err); }
});

router.get('/groups/:groupId', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.getGroupTemplates(req.params.groupId);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.get('/templates/:id', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.getTemplateById(req.params.id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.put('/templates/:id', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.updateTemplate(req.params.id, req.body);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.patch('/templates/:id/toggle', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.toggleActive(req.params.id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.delete('/templates/:id', rbac(ADMIN), async (req, res, next) => {
  try {
    await svc.deleteTemplate(req.params.id);
    return successResponse(res, { ok: true });
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

// ── Occurrences ───────────────────────────────────────────────────────────────

// GET /api/recurring-guides/occurrences - list (admin sees all, producer/chief sees own)
router.get('/occurrences', rbac(PRODUCERS), async (req, res, next) => {
  try {
    const data = await svc.getOccurrences(req.query, req.user);
    return successResponse(res, data);
  } catch (err) { next(err); }
});

router.get('/occurrences/:id', rbac(PRODUCERS), async (req, res, next) => {
  try {
    const data = await svc.getOccurrenceById(req.params.id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.patch('/occurrences/:id/start', rbac(PRODUCERS), async (req, res, next) => {
  try {
    const data = await svc.startOccurrence(req.params.id, req.user._id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.patch('/occurrences/:id/submit', rbac(PRODUCERS), async (req, res, next) => {
  try {
    const data = await svc.submitOccurrence(req.params.id, req.user._id, req.body.notes);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.patch('/occurrences/:id/validate', rbac([ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF]), async (req, res, next) => {
  try {
    const data = await svc.validateOccurrence(req.params.id, req.user._id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.patch('/occurrences/:id/disable', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.disableOccurrence(req.params.id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.patch('/occurrences/:id/enable', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.enableOccurrence(req.params.id);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.post('/occurrences/:id/request-access', rbac(PRODUCERS), async (req, res, next) => {
  try {
    const data = await svc.requestAccess(req.params.id, req.user);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

router.post('/occurrences/:id/grant-access', rbac(ADMIN), async (req, res, next) => {
  try {
    const data = await svc.grantAccess(req.params.id, req.user);
    return successResponse(res, data);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
});

module.exports = router;

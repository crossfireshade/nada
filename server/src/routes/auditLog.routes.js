const { Router } = require('express');
const auditLogCtrl = require('../controllers/auditLog.controller');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(auth);

router.get(
  '/',
  rbac([ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF]),
  auditLogCtrl.getAuditLogs
);

module.exports = router;

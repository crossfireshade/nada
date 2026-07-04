const { Router } = require('express');
const guideCtrl = require('../controllers/guide.controller');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ALL_ROLES, ROLES } = require('../utils/constants');

const router = Router();

// All roles except RECEPTIONNISTE_POLICIER
const ALLOWED = ALL_ROLES.filter((r) => r !== ROLES.RECEPTIONNISTE_POLICIER);

router.use(auth, rbac(ALLOWED));

router.get('/', guideCtrl.getGuides);
router.get('/check-guest', guideCtrl.checkGuestConflict);
router.get('/:id/guest-conflicts', guideCtrl.getGuestConflicts);
router.get('/:id', guideCtrl.getGuideById);
router.post('/', rbac([ROLES.PRODUCTEUR, ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF]), guideCtrl.createGuide);
router.put('/:id', guideCtrl.updateGuide);
router.patch('/:id/submit', guideCtrl.submitGuide);
router.patch('/:id/approve', guideCtrl.approveGuide);
router.patch('/:id/publish', guideCtrl.publishGuide);
router.patch('/:id/validate', guideCtrl.validateGuide);
router.patch('/:id/reject', guideCtrl.rejectGuide);
router.patch('/:id/start-live', guideCtrl.startLiveGuide);
router.patch('/:id/stop-live', guideCtrl.stopLiveGuide);
router.patch('/:id/restart-live', guideCtrl.restartLiveGuide);
router.patch('/:id/archive', guideCtrl.archiveGuide);
router.delete('/:id', rbac([ROLES.PRODUCTEUR, ROLES.RESPONSABLE_PRODUCTION, ROLES.TECHNICIEN_COORDINATEUR, ROLES.RESPONSABLE_ADMINISTRATIF]), guideCtrl.deleteGuide);

module.exports = router;

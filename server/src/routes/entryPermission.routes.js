const { Router } = require('express');
const epCtrl = require('../controllers/entryPermission.controller');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(auth);

router.get('/', epCtrl.getEntryPermissions);
router.get('/inbox', rbac([ROLES.RECEPTIONNISTE_POLICIER, ROLES.RESPONSABLE_SECURITE, ROLES.RESPONSABLE]), epCtrl.getInbox);
router.get('/:id', epCtrl.getEntryPermissionById);
router.post(
  '/',
  rbac([
    ROLES.PRODUCTEUR,
    ROLES.RESPONSABLE_PRODUCTION,
    ROLES.TECHNICIEN_COORDINATEUR,
    ROLES.RESPONSABLE_ADMINISTRATIF,
    ROLES.RESPONSABLE_PUBLICITE,
    ROLES.RESPONSABLE_SECURITE,
    ROLES.RESPONSABLE,
  ]),
  epCtrl.createEntryPermission
);
router.patch('/:id/approve', rbac([ROLES.RESPONSABLE_PRODUCTION]), epCtrl.approveEntryPermission);
router.patch('/:id/reject', rbac([ROLES.RESPONSABLE_PRODUCTION]), epCtrl.rejectEntryPermission);
router.put('/:id', epCtrl.updateEntryPermission);
router.delete('/:id', epCtrl.deleteEntryPermission);

// Entry permission guests
router.get('/:permId/guests', epCtrl.getPermissionGuests);
router.post('/:permId/guests', epCtrl.addPermissionGuest);
router.patch('/:permId/guests/:id/checkin', epCtrl.checkinPermissionGuest);
router.patch('/:permId/guests/:id/cin', epCtrl.updateGuestCin);

module.exports = router;

const { Router } = require('express');
const userCtrl = require('../controllers/user.controller');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ROLES } = require('../utils/constants');

const router = Router();

router.use(auth);

router.get(
  '/',
  rbac([ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF]),
  userCtrl.getUsers
);
router.post(
  '/',
  rbac([ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF]),
  userCtrl.createUser
);
router.get('/:id', userCtrl.getUserById);
router.put('/:id', userCtrl.updateUser);
router.delete(
  '/:id',
  rbac([ROLES.RESPONSABLE_PRODUCTION, ROLES.RESPONSABLE_ADMINISTRATIF]),
  userCtrl.deleteUser
);

module.exports = router;

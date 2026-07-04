const { Router } = require('express');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ROLES } = require('../utils/constants');
const settingCtrl = require('../controllers/setting.controller');

const router = Router();
router.use(auth);

router.get('/', settingCtrl.getSettings);
router.put('/:key', rbac([ROLES.RESPONSABLE_ADMINISTRATIF]), settingCtrl.updateSetting);

module.exports = router;

const { Router } = require('express');
const alertCtrl = require('../controllers/alert.controller');
const auth = require('../middlewares/auth');

const router = Router();

router.use(auth);

router.get('/', alertCtrl.getAlerts);
router.post('/guest-conflict', alertCtrl.createGuestConflictAlert);
router.patch('/read-all', alertCtrl.markAllRead);
router.patch('/:id/read', alertCtrl.markRead);
router.patch('/:id/dismiss', alertCtrl.dismiss);
router.delete('/:id', alertCtrl.deleteAlert);

module.exports = router;

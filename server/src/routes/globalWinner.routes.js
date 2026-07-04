const { Router } = require('express');
const winnerCtrl = require('../controllers/winner.controller');
const auth = require('../middlewares/auth');

const router = Router();
router.use(auth);
router.get('/blacklist', winnerCtrl.getBlacklist);

module.exports = router;

const { Router } = require('express');
const winnerCtrl = require('../controllers/winner.controller');
const auth = require('../middlewares/auth');

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', winnerCtrl.getWinners);
router.post('/', winnerCtrl.createWinner);
router.put('/:id', winnerCtrl.updateWinner);
router.patch('/:id/receive', winnerCtrl.receiveWinner);
router.post('/send-to-publicity', winnerCtrl.sendToPublicity);
router.delete('/:id', winnerCtrl.deleteWinner);

module.exports = router;

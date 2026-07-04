const { Router } = require('express');
const songCtrl = require('../controllers/song.controller');
const auth = require('../middlewares/auth');

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/check-duplicate', songCtrl.checkDuplicateSong);
router.get('/', songCtrl.getSongs);
router.post('/', songCtrl.createSong);
router.put('/:id', songCtrl.updateSong);
router.delete('/:id', songCtrl.deleteSong);
router.patch('/:id/validate', songCtrl.validateSong);

module.exports = router;

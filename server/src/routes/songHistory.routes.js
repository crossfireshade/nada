const { Router } = require('express');
const router = Router();
const auth = require('../middlewares/auth');
const songCtrl = require('../controllers/song.controller');

router.get('/history', auth, songCtrl.getValidatedSongs);
router.get('/history/genre-stats', auth, songCtrl.getGenreStats);
router.patch('/history/genre/:id', auth, songCtrl.updateSongGenre);
router.post('/history/classify/:id', auth, songCtrl.classifySongById);
router.delete('/history/:id', auth, songCtrl.deleteHistorySong);

module.exports = router;

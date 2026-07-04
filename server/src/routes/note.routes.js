const { Router } = require('express');
const noteCtrl = require('../controllers/note.controller');
const auth = require('../middlewares/auth');

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', noteCtrl.getNotes);
router.post('/', noteCtrl.createNote);
router.put('/:noteId', noteCtrl.updateNote);
router.delete('/:noteId', noteCtrl.deleteNote);

module.exports = router;

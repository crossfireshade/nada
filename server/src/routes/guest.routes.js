const { Router } = require('express');
const guestCtrl = require('../controllers/guest.controller');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', guestCtrl.getGuests);
router.post('/', guestCtrl.createGuest);
router.put('/:id', guestCtrl.updateGuest);
router.delete('/:id', guestCtrl.deleteGuest);
router.post('/:id/upload-photo', upload.single('photo'), guestCtrl.uploadGuestPhoto);
router.post('/:id/delete-photo', guestCtrl.deleteGuestPhoto);
router.post('/:id/replace-photo', upload.single('photo'), guestCtrl.replaceGuestPhoto);
router.patch('/:id/mark-present', guestCtrl.markGuestPresent);

module.exports = router;

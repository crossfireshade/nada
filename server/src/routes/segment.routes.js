const { Router } = require('express');
const segmentCtrl = require('../controllers/segment.controller');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// mergeParams allows access to :guideId from parent router
const router = Router({ mergeParams: true });

router.use(auth);

router.get('/', segmentCtrl.getSegments);
router.post('/', segmentCtrl.createSegment);
router.put('/:id', segmentCtrl.updateSegment);
router.delete('/:id', segmentCtrl.deleteSegment);
router.patch('/:id/complete', segmentCtrl.completeSegment);
router.post('/:id/upload-photo', upload.single('photo'), segmentCtrl.uploadSegmentPhoto);

module.exports = router;

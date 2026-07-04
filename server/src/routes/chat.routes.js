const { Router } = require('express');
const ctrl = require('../controllers/chat.controller');
const auth = require('../middlewares/auth');
const uploadChat = require('../middlewares/uploadChat');

const router = Router();
router.use(auth);

router.get('/users', ctrl.getChatUsers);
router.get('/unread', ctrl.getTotalUnread);
router.get('/conversations', ctrl.getConversations);
router.post('/conversations', ctrl.getOrCreateConversation);
router.get('/conversations/:id/messages', ctrl.getMessages);
router.patch('/conversations/:id/read', ctrl.markRead);
router.delete('/conversations/:id', ctrl.deleteConversation);
router.delete('/conversations/:convId/messages/:msgId', ctrl.deleteMessage);
router.post('/upload', uploadChat.single('file'), ctrl.uploadChatFile);

module.exports = router;

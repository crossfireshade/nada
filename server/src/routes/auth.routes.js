const { Router } = require('express');
const { body } = require('express-validator');
const authCtrl = require('../controllers/auth.controller');
const auth = require('../middlewares/auth');

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  authCtrl.login
);

router.post('/refresh', authCtrl.refresh);

router.post('/logout', auth, authCtrl.logout);

module.exports = router;

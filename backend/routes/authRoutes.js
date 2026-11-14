const express = require('express');
const router  = express.Router();
const {
  sendSignupOtp, verifySignupOtp, signup, login, me, updateMe, changePassword, forgotPassword, verifyResetOtp, resetPassword,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Sign up: email a code, confirm it (-> signupToken), then create the account with the details
router.post('/signup/send-otp', sendSignupOtp);
router.post('/signup/verify-otp', verifySignupOtp);
router.post('/signup', signup);

router.post('/login', login);
router.get('/me', requireAuth, me);
// My profile: edit details, change password
router.put('/me', requireAuth, updateMe);
router.put('/password', requireAuth, changePassword);

// Forgot password: email a code, check it, then set the new password
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;

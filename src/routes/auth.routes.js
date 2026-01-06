const express = require('express');
const router = express.Router();

// Middleware to protect routes (You need to have this middleware)
// const { protect } = require('../middleware/auth.middleware'); 
// Assuming you have a middleware that verifies JWT and adds user to req.user
// If you don't have it, create a simple one.

const {
  register,
  verifyEmail,
  loginRequestOTP,
  verifyLoginOTP,
  loginWithPassword,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe
} = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');


router.get('/profile',verifyToken,getMe);

// ==============================
// REGISTER & VERIFY
// ==============================
router.post('/register', register);
router.post('/verify-email', verifyEmail); // New Endpoint

// ==============================
// SECURE LOGIN (3 STEP)
// ==============================
router.post('/login/request-otp', loginRequestOTP);
router.post('/login/verify-otp', verifyLoginOTP);
router.post('/login/password', loginWithPassword);

// ==============================
// PASSWORD RECOVERY
// ==============================
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ==============================
// ACCOUNT MANAGEMENT (Protected)
// ==============================
// router.use(protect); // Uncomment this line if you have auth middleware
// router.put('/change-password', protect, changePassword); 
// For now, I will write it as:
router.put('/change-password', /* middleware here */ changePassword);


module.exports = router;
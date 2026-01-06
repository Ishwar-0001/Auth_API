const crypto = require('crypto');
const User = require('../models/User');
const generateUniqueUsername = require('../services/username.service');
const { generateOTP, hashOTP, verifyOTP } = require('../services/otp.service');
const sendEmail = require('../utils/sendEmail');
const generateToken = require('../utils/generateToken');
const Validate = require('../validations/auth.validation');

// =====================================================
// 1. REGISTER
// =====================================================
exports.register = async (req, res) => {
  try {
    const { error, value } = Validate.register.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { firstName, lastName, email, password } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const username = await generateUniqueUsername(email);

    // Generate Verification OTP
    const otp = generateOTP();

    // Create User with 'expireAt' set to 5 minutes from now
    const user = await User.create({
      firstName, lastName, email, password, username,
      role: 'admin',
      isVerified: false,
      otpHash: hashOTP(otp),
      otpExpiry: Date.now() + 10 * 60 * 1000, 
      expireAt: Date.now() + 5 * 60 * 1000,   
    });

    // EMAIL: Send Registration OTP
    await sendEmail(
      user.email,
      'Verify your email',    // Subject
      'otp.ejs',              // Template
      { 
        title: 'Verify your email', // Pass dynamic title
        otp: otp 
      }
    );

    res.status(201).json({ message: 'Registration successful. Please verify OTP within 5 minutes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 2. VERIFY EMAIL
// =====================================================
exports.verifyEmail = async (req, res) => {
  try {
    const { error, value } = Validate.verifyEmail.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, otp } = value;

    const user = await User.findOne({ email }).select('+otpHash +otpExpiry');

    if (!user) return res.status(400).json({ message: 'Invalid email or user expired' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

    if (!user.otpHash || Date.now() > user.otpExpiry || !verifyOTP(otp, user.otpHash)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    user.expireAt = undefined;

    await user.save({ validateBeforeSave: false });

    // EMAIL: Send Verified Success / Welcome
    await sendEmail(
      user.email,
      'Welcome to TexorLab! 🚀',
      'verified.ejs',
      { 
        name: user.firstName,
        dashboard_url: `${process.env.CLIENT_URL}/dashboard`
      }
    );

    res.json({ message: 'Email verified successfully. Welcome email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 3. LOGIN: REQUEST OTP
// =====================================================
exports.loginRequestOTP = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: 'Identifier required' });

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user || !user.isVerified) {
      return res.status(400).json({ message: 'User not found or not verified' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({ message: 'Account is temporarily locked. Try again later.' });
    }

    const otp = generateOTP();
    user.loginOtpHash = hashOTP(otp);
    user.loginOtpExpiry = Date.now() + 5 * 60 * 1000;
    user.loginOtpAttempts = 0;
    user.loginOtpVerified = false; 

    await user.save({ validateBeforeSave: false });

    // EMAIL: Send Login OTP (Reusing otp.ejs)
    await sendEmail(
      user.email, 
      'Login OTP', 
      'otp.ejs',
      { 
        title: 'Login Verification', // Dynamic Title for Login
        otp: otp 
      }
    );

    res.json({ message: 'OTP sent to registered email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 4. LOGIN: VERIFY OTP
// =====================================================
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+loginOtpHash +loginOtpExpiry +loginOtpAttempts');

    if (!user) return res.status(400).json({ message: 'Invalid request' });

    if (user.loginOtpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed OTP attempts' });
    }

    if (!user.loginOtpHash || Date.now() > user.loginOtpExpiry || !verifyOTP(otp, user.loginOtpHash)) {
      user.loginOtpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.loginOtpVerified = true;
    user.loginOtpHash = undefined;
    user.loginOtpExpiry = undefined;
    user.loginOtpAttempts = 0;

    await user.save({ validateBeforeSave: false });

    res.json({ message: 'OTP Verified. Please proceed to enter password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 5. LOGIN: PASSWORD
// =====================================================
exports.loginWithPassword = async (req, res) => {
  try {
    const { error, value } = Validate.login.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { identifier, password } = value;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+password +loginOtpVerified +loginAttempts +lockUntil');

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({ message: 'Account locked due to too many failed attempts' });
    }

    if (!user.loginOtpVerified) {
      return res.status(403).json({ message: 'OTP verification required first' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.loginOtpVerified = false; 
    await user.resetLoginAttempts();

    const token = generateToken(user);
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 6. FORGOT PASSWORD
// =====================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { error, value } = Validate.forgotPassword.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findOne({ email: value.email });

    if (user && user.isVerified) {
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      // EMAIL: Send Reset Link
      await sendEmail(
        user.email, 
        'Reset Password', 
        'reset_password.ejs',
        { 
          name: user.firstName, 
          action_url: resetUrl 
        }
      );
    }

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 7. RESET PASSWORD
// =====================================================
exports.resetPassword = async (req, res) => {
  try {
    const { error, value } = Validate.resetPassword.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { token, newPassword } = value;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // OPTIONAL: Send a "Password Changed Successfully" email here if you want extra security
    // await sendEmail(user.email, 'Security Alert', 'verified.ejs', { name: user.firstName, dashboard_url: ... });

    res.json({ message: 'Password reset successful. Please login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 8. CHANGE PASSWORD (Logged In)
// =====================================================
exports.changePassword = async (req, res) => {
  try {
    const { error, value } = Validate.changePassword.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { oldPassword, newPassword } = value;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =====================================================
// 9. GET CURRENT USER (Protected Route)
// =====================================================
exports.getMe = async (req, res) => {
  try {
    // req.user.id comes from your middleware (verifyToken)
    const user = await User.findById(req.user.id).select('-password -otpHash -loginOtpHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        username:user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
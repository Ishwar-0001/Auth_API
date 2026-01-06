const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC IDENTITY
    // =========================
    firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    lastName:  { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    username:  { type: String, required: true, unique: true, lowercase: true, trim: true, index: true, immutable: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    // =========================
    // AUTHENTICATION
    // =========================
    password: { type: String, required: true, minlength: 8, select: false },
    passwordChangedAt: { type: Date, select: false },
    role: { type: String, enum: ['admin'], default: 'admin' },

    // =========================
    // SECURITY STATE
    // =========================
    isVerified: { type: Boolean, default: false }, // Removed select: false so we can check status easily

    // 🛑 AUTO-DELETE: If user is not verified, this document self-destructs
    expireAt: { type: Date, default: undefined }, 

    // Registration/Email Verification OTP
    otpHash: { type: String, select: false },
    otpExpiry: { type: Date, select: false },

    // Login OTP State
    loginOtpHash: { type: String, select: false },
    loginOtpExpiry: { type: Date, select: false },
    loginOtpAttempts: { type: Number, default: 0, select: false },
    loginOtpVerified: { type: Boolean, default: false, select: false }, // Acts as a temporary gate pass

    // Brute Force Protection (Password)
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLogin: { type: Date, select: false },

    // Password Reset
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ======================================================
// 🕒 TTL INDEX (Auto-Remove Unverified Users)
// ======================================================
// MongoDB will verify the 'expireAt' field. If the current time > expireAt, the doc is deleted.
userSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// ======================================================
// 🔐 PASSWORD HASHING
// ======================================================
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

// ======================================================
// 🔑 HELPER METHODS
// ======================================================
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(String(enteredPassword), this.password);
};

// Increment login attempts for brute force protection
userSchema.methods.incrementLoginAttempts = function () {
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If lock expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    updates.$set = { loginAttempts: 1 };
    updates.$unset = { lockUntil: 1 };
  }
  // Lock account if > 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
    updates.$set = { ...(updates.$set || {}), lockUntil: Date.now() + 60 * 60 * 1000 }; // 1 hour lock
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1, expireAt: 1 } // Ensure expireAt is gone on successful login just in case
  });
};

userSchema.methods.getResetPasswordToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return token;
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  return jwtTimestamp < this.passwordChangedAt.getTime() / 1000;
};

module.exports = mongoose.model('User', userSchema);
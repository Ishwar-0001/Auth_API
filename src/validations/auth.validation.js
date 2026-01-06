const Joi = require('joi');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const register = Joi.object({
  firstName: Joi.string().min(2).max(50).required().trim(),
  lastName: Joi.string().min(2).max(50).required().trim(),
  email: Joi.string().email({ tlds: { allow: false } }).required().lowercase().trim(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': 'Password must be strong (Upper, Lower, Number, Special char)',
  }),
});

// NEW: Verify Email OTP
const verifyEmail = Joi.object({
  email: Joi.string().email().required().trim(),
  otp: Joi.string().length(6).required().trim(),
});

const login = Joi.object({
  identifier: Joi.string().required().trim(),
  password: Joi.string().required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required().trim(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().pattern(passwordPattern).required(),
  confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

// NEW: Change Password (Authenticated)
const changePassword = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().pattern(passwordPattern).required(),
  confirmNewPassword: Joi.any().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

module.exports = { register, verifyEmail, login, forgotPassword, resetPassword, changePassword };
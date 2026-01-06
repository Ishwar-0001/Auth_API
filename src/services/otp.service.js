const crypto = require('crypto');
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};
const verifyOTP = (enteredOtp, storedOtpHash) => {
  if (!enteredOtp || !storedOtpHash) return false;
  const enteredHash = hashOTP(enteredOtp);
  const buffer1 = Buffer.from(enteredHash);
  const buffer2 = Buffer.from(storedOtpHash);
  if (buffer1.length !== buffer2.length) return false;
  return crypto.timingSafeEqual(buffer1, buffer2);
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP
};

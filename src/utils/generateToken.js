const jwt = require('jsonwebtoken');
const generateToken = (user, expiresIn = process.env.JWT_EXPIRE) => {
  if (!user || !user._id) {
    throw new Error('Invalid user object');
  }
  const payload = {
    id: user._id,
    role: user.role,
    email: user.email,
    username: user.username,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  return token;
};

module.exports = generateToken;

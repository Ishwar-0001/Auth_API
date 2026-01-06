const crypto = require('crypto');
const User = require('../models/User');

const MAX_BASE_LENGTH = 10;
const MAX_ATTEMPTS = 5;

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, MAX_BASE_LENGTH);

const randomSuffix = (bytes = 3) =>
  crypto.randomBytes(bytes).toString('hex'); // cryptographically secure

const generateUniqueUsername = async (email) => {
  // ❌ Never trust email directly
  let base = normalize(email?.split('@')[0] || '');

  // fallback if email is weird or empty
  if (!base) {
    base = `user${crypto.randomBytes(2).toString('hex')}`;
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const username =
      attempt === 0
        ? `${base}_${randomSuffix(2)}`
        : `${base}_${randomSuffix(3)}`;

    const exists = await User.exists({ username });

    if (!exists) return username;
  }

  // 🔒 last-resort entropy (almost impossible to collide)
  return `u_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
};

module.exports = generateUniqueUsername;

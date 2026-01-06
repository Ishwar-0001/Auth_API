require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const generateUniqueUsername = require('../services/username.service');

const MONGO_URI = process.env.MONGO_URI;

async function createInitialAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    // 🔍 Check if an admin already exists
    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) {
      console.log('✅ Admin already exists. Skipping creation.');
      process.exit(0);
    }

    // 🔐 Generate strong random password
    const password = crypto.randomBytes(12).toString('hex');

    // 🆔 Generate unique username based on email
    const username = await generateUniqueUsername(process.env.INIT_ADMIN_EMAIL);

    // 🔒 Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: process.env.INIT_ADMIN_EMAIL,
      username,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    });

    console.log('🚀 Initial admin created successfully');
    console.log('📧 Email:', admin.email);
    console.log('👤 Username:', admin.username);
    console.log('🔑 Temporary Password:', password);
    console.log('⚠️ Change password immediately after login');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create initial admin:', error);
    process.exit(1);
  }
}

createInitialAdmin();

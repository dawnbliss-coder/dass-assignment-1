const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';

    const admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      console.log(`No user found with email: ${adminEmail}`);
      console.log('Run: npm run create-admin');
      process.exit(1);
    }

    admin.role = 'admin';
    admin.firstName = admin.firstName || adminFirstName;
    admin.lastName = admin.lastName || 'User';

    // IMPORTANT: set plaintext; pre-save hook will hash once.
    admin.password = adminPassword;
    await admin.save();

    console.log('\n Admin password reset successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Login Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nIf Chrome shows a “breached password” warning, just pick a stronger ADMIN_PASSWORD in backend/.env.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin password:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();


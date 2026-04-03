/**
 * EESA MongoDB Seed Script
 * Seeds the admin account
 * Run: node backend/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eesa';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  try {
    const accounts = [
      { username: 'admin', password: 'admin123', fullName: 'System Administrator', role: 'superadmin' },
      { username: 'chairperson', password: 'chair2024', fullName: 'EESA Chairperson', role: 'admin' },
      { username: 'vicechairperson', password: 'vice2024', fullName: 'EESA Vice Chairperson', role: 'admin' }
    ];

    for (const acc of accounts) {
      const existing = await Admin.findOne({ username: acc.username });
      if (existing) {
        console.log(`  ${acc.username} already exists, skipping.`);
      } else {
        await Admin.create(acc);
        console.log(`  Created ${acc.username} (${acc.role})`);
      }
    }

    console.log('\n=== Seed Complete ===');
    console.log('Admin logins:');
    console.log('  admin / admin123 (superadmin)');
    console.log('  chairperson / chair2024');
    console.log('  vicechairperson / vice2024');
  } catch (err) {
    console.error('Error during seeding:', err.message || err);
    if (err.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed().then(() => {
  console.log('Seed finished successfully');
  process.exit(0);
}).catch(err => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});

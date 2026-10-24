import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';

/**
 * Seed script to ensure the primary Administrator account exists
 */
const seedAdmin = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    const adminEmail = (env.admin?.email || 'admin@marketplace.com').toLowerCase().trim();
    const adminPassword = env.admin?.password || 'Admin@123456';

    console.log(`[Seed] Checking for existing admin user: ${adminEmail}...`);
    const existingUser = await User.findOne({ email: adminEmail });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`[Seed] Admin user '${adminEmail}' already exists with role 'admin'.`);
      } else {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`[Seed] Existing user '${adminEmail}' updated to role 'admin'.`);
      }
    } else {
      console.log(`[Seed] Creating new admin account for '${adminEmail}'...`);
      const passwordHash = await User.hashPassword(adminPassword);

      await User.create({
        name: 'Platform Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
      });

      console.log(`[Seed] Admin account '${adminEmail}' created successfully!`);
    }

    console.log('[Seed] Seeding completed.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error seeding admin account: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();

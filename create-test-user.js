require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');

// Creates the first admin account. Credentials come from the environment:
//   MONGO_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node create-test-user.js
async function createAdminUser() {
  const { MONGO_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('MONGO_URL, ADMIN_EMAIL and ADMIN_PASSWORD must be set.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB');

    const existingUser = await User.findOne({ email: ADMIN_EMAIL });
    if (existingUser) {
      console.log(`User ${ADMIN_EMAIL} already exists`);
      await mongoose.disconnect();
      return;
    }

    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      centers: [],
      services: [],
      percentage: 100,
      isAdmin: true
    });

    await adminUser.save();
    console.log(`Admin user ${ADMIN_EMAIL} created successfully`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

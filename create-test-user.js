require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');

async function createTestUser() {
  try {
    // Get MongoDB URL from environment variable or use the fallback
    const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://amoyavalls:IEHQ4ksdLTyMMZed@cluster0.pa3o6zg.mongodb.net/gogain?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Check if admin user already exists
    const existingUser = await User.findOne({ email: 'admin@gogain.com' });
    if (existingUser) {
      console.log('Admin user already exists');
      await mongoose.disconnect();
      return;
    }
    
    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gogain.com',
      password: 'GogainAdmin123!',
      phoneNumber: '0123456789',
      birthdate: new Date('1990-01-01'),
      centers: [],
      services: [],
      isAdmin: true
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@gogain.com');
    console.log('Password: GogainAdmin123!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createTestUser(); 
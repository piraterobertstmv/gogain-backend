require('dotenv').config();
const mongoose = require('mongoose');

async function connectDb() {
  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  };

  // The connection string must come from the environment — never hard-code credentials.
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    throw new Error('MongoDB URL is required. Set the MONGO_URL environment variable.');
  }
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, options);
    console.log('Db connecté!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = {
    connectDb
}
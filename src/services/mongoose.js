require('dotenv').config();
const mongoose = require('mongoose');

async function connectDb() {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  };
  
  // Get MongoDB URL from environment variable or use a fallback for development
  const mongoUrl = process.env.MONGO_URL || 'mongodb+srv://amoyavalls:IEHQ4ksdLTyMMZed@cluster0.pa3o6zg.mongodb.net/gogain?retryWrites=true&w=majority&appName=Cluster0';
  
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
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
  
  try {
    await mongoose.connect(process.env.MONGO_URL, options);
    console.log('Db connecté!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = {
    connectDb
}
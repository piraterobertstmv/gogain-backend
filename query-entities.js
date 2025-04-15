require('dotenv').config();
const mongoose = require('mongoose');

// Get the MongoDB connection string from .env
const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/gogain';

console.log('Connecting to MongoDB:', MONGODB_URI);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Get collections directly
    const db = mongoose.connection.db;
    
    // Query collections
    console.log('\n========== QUERYING DATABASE ==========\n');
    
    // Get all clients
    const clients = await db.collection('clients').find({}).toArray();
    console.log('\n=== CLIENTS ===');
    console.log('Total clients:', clients.length);
    clients.forEach(client => {
      const name = client.firstName && client.lastName ? 
        `${client.firstName} ${client.lastName}` : 
        (client.name || 'Unknown');
      console.log(`ID: ${client._id}, Name: "${name}"`);
    });
    
    // Get all centers
    const centers = await db.collection('centers').find({}).toArray();
    console.log('\n=== CENTERS ===');
    console.log('Total centers:', centers.length);
    centers.forEach(center => {
      console.log(`ID: ${center._id}, Name: "${center.name}"`);
    });
    
    // Get all services
    const services = await db.collection('services').find({}).toArray();
    console.log('\n=== SERVICES ===');
    console.log('Total services:', services.length);
    services.forEach(service => {
      console.log(`ID: ${service._id}, Name: "${service.name}"`);
    });
    
    // Output mapping objects for frontend implementation
    console.log('\n=== CLIENT MAPPINGS FOR FRONTEND ===');
    console.log('const clientMappings = {');
    clients.forEach(client => {
      const name = client.firstName && client.lastName ? 
        `${client.firstName} ${client.lastName}` : 
        (client.name || 'Unknown');
      console.log(`  "${name}": "${client._id}",`);
    });
    console.log('};');
    
    console.log('\n=== CENTER MAPPINGS FOR FRONTEND ===');
    console.log('const centerMappings = {');
    centers.forEach(center => {
      console.log(`  "${center.name}": "${center._id}",`);
    });
    console.log('};');
    
    console.log('\n=== SERVICE MAPPINGS FOR FRONTEND ===');
    console.log('const serviceMappings = {');
    services.forEach(service => {
      console.log(`  "${service.name}": "${service._id}",`);
    });
    console.log('};');
    
  } catch (error) {
    console.error('Error querying data:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

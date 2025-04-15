const mongoose = require('mongoose');
const Service = require('./src/models/service');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gogain')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // List of services to add (removing duplicates)
    const servicesToAdd = [
      "MASSE SALARIALE",
      "FRAIS BANQUE",
      "TPE BANQUE",
      "LOYER CABINET",
      "PERSONAL EXPENSE",
      "MUTUELLE",
      "LEASING VOITURE",
      "PREVOYANCE",
      "LOGICIEL CABINET",
      "ASSURANCE",
      "CHARGES SOCIALES",
      "CREDIT CABINET",
      "INTERNET",
      "URSSAF/CHARGES SOCIALES",
      "MUTUELLE SALARIÉ"
    ];
    
    // Get existing services
    const existingServices = await Service.find({});
    console.log(`Found ${existingServices.length} existing services`);
    
    // Extract names from existing services
    const existingNames = existingServices.map(service => 
      service.name.toLowerCase().trim()
    );
    
    // Filter out services that already exist
    const newServices = servicesToAdd.filter(name => 
      !existingNames.includes(name.toLowerCase().trim())
    );
    
    console.log(`Found ${newServices.length} new services to add`);
    
    // Add new services
    const results = [];
    for (const serviceName of newServices) {
      try {
        // Create new service with default cost and tax
        const newService = new Service({
          name: serviceName,
          cost: 0, // Default cost
          tax: 0   // Default tax
        });
        
        await newService.save();
        results.push({ name: serviceName, success: true });
        console.log(`Added service: ${serviceName}`);
      } catch (error) {
        results.push({ name: serviceName, success: false, error: error.message });
        console.error(`Error adding service ${serviceName}:`, error.message);
      }
    }
    
    // Summary
    console.log('\nSummary:');
    console.log(`Total services to add: ${servicesToAdd.length}`);
    console.log(`Already existing: ${servicesToAdd.length - newServices.length}`);
    console.log(`Successfully added: ${results.filter(r => r.success).length}`);
    console.log(`Failed to add: ${results.filter(r => !r.success).length}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  })
  .catch(error => {
    console.error('Error connecting to MongoDB:', error);
  }); 
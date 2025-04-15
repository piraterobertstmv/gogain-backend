const mongoose = require('mongoose');
const Client = require('./src/models/client');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // List of clients to add
    const clientsToAdd = [
      "JORGE GOENAGA PEREZ",
      "Account Maintenance Fee",
      "TPE Fixe IP + Pinpad",
      "Debit Interest and Overdraft Fees",
      "RITM LA FONTAINE",
      "Mauro Navarro",
      "Ana STEFANOVIC",
      "Card Transaction (TRANSAVIA)",
      "KARAPASS COURTAGE",
      "SOFINCO AUTO MOTO LOISIRS",
      "GIEPS-GIE DE PREVOYANCE SOCIALE",
      "Quietis Pro Renewal (JAZZPRO-25%)",
      "GG IMMOBILIER",
      "DIAC SA",
      "EPSILOG SARL",
      "MACSF-ASSU-",
      "C.A.R.P.I.M.K.O",
      "ADIS",
      "GC RE DOCTOLIB",
      "Loan Payment",
      "Matthieu Monnot",
      "Card Transaction (FRANPRIX 5055",
      "Card Transaction (GARAGE ELITE 15)",
      "Card Transaction (GAROUPE)",
      "Free Pro",
      "Card Transaction (FRANPRIX 5055)",
      "URSSAF D'ILE DE FRANCE",
      "Jazz Pro Subscription Fee",
      "SOGECAP",
      "Card Transaction (HYPER GUERITE SANS)",
      "Card Transaction (CARREFOUR CITY)",
      "Annual Card Collection Fee",
      "Visa Business Subscription Fee",
      "Card Transaction (MAGASINS NICOL*)",
      "GIE AG2R REUNICA",
      "ONEY BANQUE ACCORD",
      "AXA / SOGAREP"
    ];
    
    // Get existing clients
    const existingClients = await Client.find({});
    console.log(`Found ${existingClients.length} existing clients`);
    
    // Extract names from existing clients
    const existingNames = existingClients.map(client => 
      client.name || `${client.firstName} ${client.lastName}`
    ).map(name => name.toLowerCase().trim());
    
    // Filter out clients that already exist
    const newClients = clientsToAdd.filter(name => 
      !existingNames.includes(name.toLowerCase().trim())
    );
    
    console.log(`Found ${newClients.length} new clients to add`);
    
    // Add new clients
    const results = [];
    for (const clientName of newClients) {
      try {
        // Split name into first and last name
        let firstName = clientName;
        let lastName = '';
        
        // If it looks like a person's name (contains space and not starting with special words)
        if (clientName.includes(' ') && 
            !clientName.startsWith('Card Transaction') && 
            !clientName.startsWith('Account') &&
            !clientName.startsWith('TPE') &&
            !clientName.startsWith('Debit') &&
            !clientName.startsWith('Quietis') &&
            !clientName.startsWith('Loan') &&
            !clientName.startsWith('Jazz') &&
            !clientName.startsWith('Annual') &&
            !clientName.startsWith('Visa')) {
          const parts = clientName.split(' ');
          if (parts.length >= 2) {
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
          }
        }
        
        // Create new client
        const newClient = new Client({
          firstName,
          lastName: lastName || 'N/A',
          email: `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
          phoneNumber: '0000000000'
        });
        
        await newClient.save();
        results.push({ name: clientName, success: true });
        console.log(`Added client: ${clientName}`);
      } catch (error) {
        results.push({ name: clientName, success: false, error: error.message });
        console.error(`Error adding client ${clientName}:`, error.message);
      }
    }
    
    // Summary
    console.log('\nSummary:');
    console.log(`Total clients to add: ${clientsToAdd.length}`);
    console.log(`Already existing: ${clientsToAdd.length - newClients.length}`);
    console.log(`Successfully added: ${results.filter(r => r.success).length}`);
    console.log(`Failed to add: ${results.filter(r => !r.success).length}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  })
  .catch(error => {
    console.error('Error connecting to MongoDB:', error);
  }); 
const express = require('express');
const Transaction = require('../models/transaction');
const Client = require('../models/client');
const mongoose = require('mongoose');
const authentification = require('../middlewares/authentification');
const router = new express.Router();

// Helper function to create client if it doesn't exist
async function handleClientCreation(clientValue) {
    // If clientValue is a valid ObjectId, it's an existing client
    if (mongoose.Types.ObjectId.isValid(clientValue)) {
        return clientValue;
    }
    
    // If clientValue is a string, it's a new client name - create the client
    if (typeof clientValue === 'string' && clientValue.trim()) {
        const clientName = clientValue.trim();
        
        // Split name into first and last name (assume last name is first word, rest is first name)
        const nameParts = clientName.split(' ');
        const lastName = nameParts[0] || '';
        const firstName = nameParts.slice(1).join(' ') || lastName;
        
        try {
            // Check if client already exists with this name
            const existingClient = await Client.findOne({
                firstName: firstName,
                lastName: lastName
            });
            
            if (existingClient) {
                return existingClient._id.toString();
            }
            
            // Create new client
            const newClient = new Client({
                firstName: firstName,
                lastName: lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`, // Temporary email
                phoneNumber: '',
                gender: '',
                birthdate: null,
                zipcode: null,
                city: '',
                address: ''
            });
            
            const savedClient = await newClient.save();
            return savedClient._id.toString();
            
        } catch (error) {
            console.error('Error creating client:', error);
            throw error;
        }
    }
    
    return clientValue;
}

// Add this new endpoint to get the last transaction index
router.get('/transactions/last-index', async (req, res, next) => {
    try {
        // Find the transaction with the highest index
        const lastTransaction = await Transaction.findOne({})
            .sort({ index: -1 }) // Sort by index in descending order
            .limit(1); // Get only one document
        
        // If no transactions exist yet, return 0
        const lastIndex = lastTransaction ? lastTransaction.index : 0;
        
        res.status(200).send({ lastIndex });
    } catch(e) {
        console.error('Error fetching last transaction index:', e);
        res.status(400).send(e);
    }
});

router.post('/transaction', async (req, res, next) => {
    try {
        const transactionData = { ...req.body };
        
        // Handle client creation if needed
        if (transactionData.client) {
            transactionData.client = await handleClientCreation(transactionData.client);
        }
        
        const transaction = new Transaction(transactionData);
        await transaction.save();
        res.status(201).send({ transaction });
    } catch(e) {
        console.error('Error creating transaction:', e);
        res.status(400).send(e);
    }
});

router.get('/transaction', async (req, res, next) => {
    try {
        const transactions = await Transaction.find({});
        
        // Ensure client names are properly exposed
        const formattedTransactions = transactions.map(transaction => {
            const transObj = transaction.toObject();
            
            // If we have a clientName, make it more visible in the API response
            if (transObj.clientName) {
                transObj.clientDisplayName = transObj.clientName;
            }
            
            // Do the same for center and service
            if (transObj.centerName) {
                transObj.centerDisplayName = transObj.centerName;
            }
            
            if (transObj.serviceName) {
                transObj.serviceDisplayName = transObj.serviceName;
            }
            
            return transObj;
        });
        
        res.status(200).send({ transactions: formattedTransactions });
    } catch(e) {
        console.error('Error fetching transactions:', e);
        res.status(400).send(e);
    }
});

router.get('/transaction/:id', async (req, res, next) => {
    const transactionId = req.params.id;

    try {
        const transaction = await Transaction.findOne({ _id: transactionId });
        
        if (!transaction) {
            return res.status(404).send({ error: 'Transaction not found' });
        }
        
        const transObj = transaction.toObject();
        
        // Ensure client names are properly exposed
        if (transObj.clientName) {
            transObj.clientDisplayName = transObj.clientName;
        }
        
        // Do the same for center and service
        if (transObj.centerName) {
            transObj.centerDisplayName = transObj.centerName;
        }
        
        if (transObj.serviceName) {
            transObj.serviceDisplayName = transObj.serviceName;
        }
        
        res.status(200).send({ transaction: transObj });
    } catch(e) {
        console.error('Error fetching transaction:', e);
        res.status(400).send(e);
    }
});

router.patch('/transaction/:id', async (req, res, next) => {
    const transactionId = req.params.id;
    const transactionModified = req.body;

    try {
        await Transaction.updateOne({ _id: transactionId }, { $set: transactionModified });
        const updatedTransaction = await Transaction.find({ _id: transactionId });
        res.status(201).send({ transactionId, updatedTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/transaction/:id', async (req, res, next) => {
    const transactionId = req.params.id;

    try {
        const deleteInfos = await Transaction.deleteOne({ _id: transactionId });
        res.status(201).send({ transactionId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.post('/transactions/batch', async (req, res, next) => {
    try {
        // Expect an array of transaction objects in the request body
        const { transactions, options } = req.body;
        
        if (!Array.isArray(transactions)) {
            return res.status(400).send({ error: 'Expected an array of transactions' });
        }
        
        // Map original names to the proper fields for storage in the database
        const processedTransactions = await Promise.all(transactions.map(async transaction => {
            // Create a copy of the transaction to avoid mutating the original
            const processedTransaction = { ...transaction };
            
            // Handle client creation if needed
            if (processedTransaction.client) {
                processedTransaction.client = await handleClientCreation(processedTransaction.client);
            }
            
            // Keep the index field as provided by the frontend
            // It should already be set to the correct sequential value
            
            // Map the originalClientName to clientName if available
            if (processedTransaction.originalClientName) {
                processedTransaction.clientName = processedTransaction.originalClientName;
                // Delete the original field as it's not in our schema
                delete processedTransaction.originalClientName;
            }
            
            // Map the originalCenterName to centerName if available
            if (processedTransaction.originalCenterName) {
                processedTransaction.centerName = processedTransaction.originalCenterName;
                // Delete the original field as it's not in our schema
                delete processedTransaction.originalCenterName;
            }
            
            // Map the originalServiceName to serviceName if available
            if (processedTransaction.originalServiceName) {
                processedTransaction.serviceName = processedTransaction.originalServiceName;
                // Delete the original field as it's not in our schema
                delete processedTransaction.originalServiceName;
            }
            
            // If we have originalDateFormat, ensure it's properly handled
            if (processedTransaction.originalDateFormat) {
                // Note: We're keeping the date field as is, as it should be in ISO format
                // Delete the original field as it's not in our schema
                delete processedTransaction.originalDateFormat;
            }
            
            // Clean up any other temporary fields we might have added in the frontend
            delete processedTransaction._clientId;
            delete processedTransaction._centerId;
            delete processedTransaction._serviceId;
            delete processedTransaction._clientDisplay;
            delete processedTransaction._centerDisplay;
            delete processedTransaction._serviceDisplay;
            
            return processedTransaction;
        }));
        
        // Create and save all transactions
        const savedTransactions = await Transaction.insertMany(processedTransactions);
        
        res.status(201).send({ 
            transactions: savedTransactions, 
            insertedCount: savedTransactions.length
        });
    } catch(e) {
        console.error('Error in batch transaction creation:', e);
        res.status(400).send(e);
    }
});

// Helper functions for PDF data parsing
function parseDate(dateString) {
    try {
        // Handle DD/MM/YYYY format from PDF extractor
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                // Convert DD/MM/YYYY to YYYY-MM-DD
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                const isoDate = `${year}-${month}-${day}`;
                return new Date(isoDate);
            }
        }
        // Fallback to standard Date parsing
        return new Date(dateString);
    } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return new Date(); // Default to current date
    }
}

function parseAmount(amountString) {
    try {
        if (typeof amountString === 'number') {
            return amountString;
        }
        
        // Handle European format with comma as decimal separator
        let cleanAmount = amountString.toString().trim();
        
        // Remove currency symbols and spaces
        cleanAmount = cleanAmount.replace(/[€$£¥₹]/g, '').trim();
        
        // Convert comma to dot for decimal separator
        cleanAmount = cleanAmount.replace(',', '.');
        
        // Remove any remaining non-numeric characters except dot and minus
        cleanAmount = cleanAmount.replace(/[^0-9.-]/g, '');
        
        const parsed = parseFloat(cleanAmount);
        return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
        console.error('Error parsing amount:', amountString, error);
        return 0;
    }
}

function extractClientFromDescription(description) {
    try {
        // Extract client name from descriptions like "CARTE X2148 01/02 SUMUP"
        const parts = description.split(' ');
        
        // Look for the last part that's likely a company name
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            // Skip dates (DD/MM format) and card references
            if (!part.match(/^\d{2}\/\d{2}$/) && !part.match(/^X\d+$/)) {
                return part;
            }
        }
        
        return description; // Fallback to full description
    } catch (error) {
        console.error('Error extracting client from description:', description, error);
        return description;
    }
}

// PDF Import Endpoint - Receives data from external PDF extractor
router.post('/api/import-pdf-transactions', authentification, async (req, res, next) => {
    try {
        const { transactions, extractorData } = req.body;
        
        if (!Array.isArray(transactions)) {
            return res.status(400).send({ error: 'Expected an array of transactions' });
        }

        console.log('PDF Import Request:', {
            transactionCount: transactions.length,
            extractorData: extractorData ? 'Present' : 'Not present',
            userFromToken: req.user ? req.user._id : 'No user'
        });

        // Create intelligent mapping system for PDF categories to GoGain services
        const createCategoryToServiceMapping = () => {
            return {
                // Restaurant & Food (Common PDF extractor category)
                'restaurant/food': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'restaurant': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'food': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'dining': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'meal': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                
                // Shopping & Retail
                'shopping': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'retail': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'store': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'supermarket': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                
                // Health & Medical
                'medical': '66eb4ec8615c83d533d03887', // KINÉSITHERAPIE (30 Min)
                'healthcare': '66eb4ee0615c83d533d0388a', // OSTÉOPATHIE (Bosquet)
                'health': '66eb4ec8615c83d533d03887', // KINÉSITHERAPIE (30 Min)
                'physiotherapy': '66eb4ec8615c83d533d03887', // KINÉSITHERAPIE (30 Min)
                'osteopathy': '66eb4ee0615c83d533d0388a', // OSTÉOPATHIE (Bosquet)
                'therapy': '66eb4ec8615c83d533d03887', // KINÉSITHERAPIE (30 Min)
                'doctor': '66eb4ec8615c83d533d03887', // KINÉSITHERAPIE (30 Min)
                'pharmacy': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                
                // Fitness & Coaching
                'fitness': '66eb4f14615c83d533d03892', // HYATT COACHING
                'coaching': '67447edcb56b5793c0cda6db', // COACHING (45Min)
                'training': '66eb4f14615c83d533d03892', // HYATT COACHING
                'gym': '66eb4f14615c83d533d03892', // HYATT COACHING
                'sport': '66eb4f14615c83d533d03892', // HYATT COACHING
                
                // Digital Services & Subscriptions
                'app': '67447fc9b56b5793c0cda791', // APP (TO C)
                'digital': '66eb4f1b615c83d533d03894', // APP START (TO B)
                'subscription': '66eb4f0a615c83d533d03890', // GAIN ONE (3 months)
                'software': '66eb4f1b615c83d533d03894', // APP START (TO B)
                'online service': '66eb4f1b615c83d533d03894', // APP START (TO B)
                'streaming': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                
                // Business Services
                'business': '66eb4f20615c83d533d03896', // APP BOOST ( TO B)
                'corporate': '66eb4f20615c83d533d03896', // APP BOOST ( TO B)
                'consultation': '67447edcb56b5793c0cda6db', // COACHING (45Min)
                'professional': '66eb4f20615c83d533d03896', // APP BOOST ( TO B)
                
                // Transportation
                'transport': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'transportation': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'vehicle': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'car': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'taxi': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'uber': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'fuel': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'gas': '67d816374abe8436385a7ad9', // LEASING VOITURE
                'parking': '67d816374abe8436385a7ad9', // LEASING VOITURE
                
                // Banking & Finance
                'bank': '67d816374abe8436385a7acf', // FRAIS BANQUE
                'banking': '67d816374abe8436385a7acf', // FRAIS BANQUE
                'finance': '67d816374abe8436385a7acf', // FRAIS BANQUE
                'fee': '67d816374abe8436385a7acf', // FRAIS BANQUE
                'charge': '67d816374abe8436385a7acf', // FRAIS BANQUE
                'atm': '67d816374abe8436385a7acf', // FRAIS BANQUE
                'credit': '67d816374abe8436385a7ae3', // CREDIT CABINET
                'loan': '67d816374abe8436385a7ae3', // CREDIT CABINET
                
                // Insurance & Legal
                'insurance': '67d816374abe8436385a7adf', // ASSURANCE
                'legal': '67d816374abe8436385a7adf', // ASSURANCE
                'mutuelle': '67d816374abe8436385a7ad7', // MUTUELLE
                
                // Office & Rent
                'rent': '67d816374abe8436385a7ad3', // LOYER CABINET
                'office': '67d816374abe8436385a7ad3', // LOYER CABINET
                'cabinet': '67d816374abe8436385a7ad3', // LOYER CABINET
                'utilities': '67d816374abe8436385a7ae5', // INTERNET
                
                // Technology & Communication
                'internet': '67d816374abe8436385a7ae5', // INTERNET
                'technology': '67d816374abe8436385a7add', // LOGICIEL CABINET
                'tech': '67d816374abe8436385a7add', // LOGICIEL CABINET
                'phone': '67d816374abe8436385a7ae5', // INTERNET
                'mobile': '67d816374abe8436385a7ae5', // INTERNET
                
                // Entertainment & Leisure
                'entertainment': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'leisure': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'cinema': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'movie': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                
                // Social & Taxes
                'social': '67d816374abe8436385a7ae1', // CHARGES SOCIALES
                'tax': '67d816374abe8436385a7ae1', // CHARGES SOCIALES
                'urssaf': '67d816374abe8436385a7ae7', // URSSAF/CHARGES SOCIALES
                'charges': '67d816374abe8436385a7ae1', // CHARGES SOCIALES
                
                // Salaries & Payroll
                'salary': '67d816374abe8436385a7acd', // MASSE SALARIALE
                'salaire': '67d816374abe8436385a7acd', // MASSE SALARIALE
                'wages': '67d816374abe8436385a7acd', // MASSE SALARIALE
                'payroll': '67d816374abe8436385a7acd', // MASSE SALARIALE
                
                // General Expenses
                'expense': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'cost': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'payment': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'purchase': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                
                // Default fallback
                'other': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'others': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'misc': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'miscellaneous': '67d816374abe8436385a7ad5', // PERSONAL EXPENSE
                'unknown': '67d816374abe8436385a7ad5' // PERSONAL EXPENSE
            };
        };

        // Function to map PDF category to GoGain service ID
        const mapCategoryToService = (category) => {
            if (!category) return '67d816374abe8436385a7ad5'; // Default to PERSONAL EXPENSE
            
            const mapping = createCategoryToServiceMapping();
            const categoryLower = category.toLowerCase().trim();
            
            // Direct match
            if (mapping[categoryLower]) {
                return mapping[categoryLower];
            }
            
            // Partial match - find if category contains any of our mapped keywords
            for (const [keyword, serviceId] of Object.entries(mapping)) {
                if (categoryLower.includes(keyword) || keyword.includes(categoryLower)) {
                    return serviceId;
                }
            }
            
            // Default fallback
            return '67d816374abe8436385a7ad5'; // PERSONAL EXPENSE
        };

        // Function to map serviceName to GoGain service ID
        const mapServiceNameToId = async (serviceName) => {
            if (!serviceName) return null; // Let GoGain find a default service
            
            const serviceNameLower = serviceName.toLowerCase().trim();
            
            // Try to find the service by name in the database
            try {
                const Service = require('../models/service');
                
                // First try exact match
                let service = await Service.findOne({ 
                    name: { $regex: new RegExp(`^${serviceName}$`, 'i') } 
                });
                
                if (service) {
                    console.log(`Found exact service match: ${serviceName} -> ${service._id}`);
                    return service._id.toString();
                }
                
                // Try partial match for common variations
                const commonMappings = {
                    'autres': ['autres', 'other', 'divers'],
                    'prevoyance': ['prevoyance', 'prévoyance', 'disability'],
                    'materiel': ['materiel', 'matériel', 'material', 'cabinet'],
                    'frais': ['frais', 'fees', 'bank', 'banque'],
                    'charges': ['charges', 'social', 'sociales'],
                    'assurance': ['assurance', 'insurance'],
                    'masse': ['masse', 'salariale', 'salary', 'payroll'],
                    'kinésitherapie': ['kinésitherapie', 'kinesitherapie', 'physiotherapy'],
                    'ostéopathie': ['ostéopathie', 'osteopathie', 'osteopathy'],
                    'coaching': ['coaching', 'training']
                };
                
                // Search for partial matches
                for (const [key, variations] of Object.entries(commonMappings)) {
                    if (variations.some(variation => serviceNameLower.includes(variation))) {
                        service = await Service.findOne({ 
                            name: { $regex: new RegExp(key, 'i') } 
                        });
                        if (service) {
                            console.log(`Found partial service match: ${serviceName} -> ${service.name} (${service._id})`);
                            return service._id.toString();
                        }
                    }
                }
                
                console.log(`No service match found for: ${serviceName}, will use null`);
                return null; // Return null - PDF extractor should provide correct service IDs
                
            } catch (error) {
                console.error('Error finding service:', error);
                return null; // Return null - PDF extractor should provide correct service IDs
            }
        };

        // Function to determine default center for user
        const getDefaultCenterForUser = (user) => {
            if (!user || !user.centers || user.centers.length === 0) {
                return '66eb4e85615c83d533d03876'; // Default to BOSQUET
            }
            return user.centers[0]; // Use user's first assigned center
        };

        // Get the last transaction index for proper indexing
        const lastTransaction = await Transaction.findOne({})
            .sort({ index: -1 })
            .limit(1);
        const startIndex = lastTransaction ? lastTransaction.index : 0;

        // Process each transaction from PDF extractor
        const processedTransactions = await Promise.all(transactions.map(async (transaction, idx) => {
            try {
                // Extract fields from the new PDF extractor format
                const date = transaction.date ? new Date(transaction.date) : new Date();
                // Handle amount format properly - ensure XXX,XX format
                const cost = parseFloat(transaction.cost) || 0;
                const taxes = parseFloat(transaction.taxes) || 0;
                const clientName = transaction.clientName || 'Unknown Client';
                const serviceName = transaction.serviceName || 'Other';
                const typeOfTransaction = transaction.typeOfTransaction || 'cost';
                const typeOfMovement = transaction.typeOfMovement || 'card payment';
                const frequency = transaction.frequency || 'ordinary';
                const typeOfClient = transaction.typeOfClient || 'client';

                console.log(`Processing PDF transaction ${idx + 1}:`, {
                    date,
                    cost,
                    taxes,
                    clientName,
                    serviceName,
                    typeOfTransaction,
                    typeOfMovement,
                    frequency,
                    typeOfClient
                });

                // Map serviceName to service ID
                const serviceId = await mapServiceNameToId(serviceName);
                
                // Handle client creation from clientName
                const clientId = await handleClientCreation(clientName);
                
                // Get user's assigned center (user who extracts PDF determines center)
                const centerId = getDefaultCenterForUser(req.user);

                // Create transaction object with exact GoGain format
                const processedTransaction = {
                    index: startIndex + idx + 1,
                    date: date,
                    center: centerId,
                    client: clientId,
                    cost: cost,
                    worker: req.user._id, // JWT user ID
                    taxes: taxes,
                    typeOfTransaction: typeOfTransaction,
                    typeOfMovement: typeOfMovement,
                    frequency: frequency,
                    typeOfClient: typeOfClient,
                    service: serviceId
                };

                console.log(`Processed transaction ${idx + 1}:`, {
                    clientName,
                    serviceName,
                    mappedService: serviceId,
                    cost,
                    taxes,
                    typeOfTransaction,
                    rawCostReceived: transaction.cost,
                    parsedCost: cost
                });

                return processedTransaction;
            } catch (error) {
                console.error(`Error processing transaction ${idx}:`, error);
                return null;
            }
        }));

        // Filter out failed transactions
        const validTransactions = processedTransactions.filter(t => t !== null);

        if (validTransactions.length === 0) {
            return res.status(400).send({ 
                error: 'No valid transactions could be processed from PDF data',
                originalCount: transactions.length
            });
        }

        // Save transactions to database using existing batch logic
        const savedTransactions = await Transaction.insertMany(validTransactions);

        console.log(`Successfully imported ${savedTransactions.length} transactions from PDF`);

        // Send success response
        res.status(201).send({
            success: true,
            message: `Successfully imported ${savedTransactions.length} transactions from PDF`,
            transactions: savedTransactions,
            insertedCount: savedTransactions.length,
            originalCount: transactions.length,
            mappingInfo: {
                categoriesProcessed: transactions.map(t => t.category).filter(Boolean),
                servicesUsed: [...new Set(validTransactions.map(t => t.service))]
            }
        });

    } catch (error) {
        console.error('Error in PDF import endpoint:', error);
        res.status(500).send({
            error: 'Failed to import PDF transactions',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;
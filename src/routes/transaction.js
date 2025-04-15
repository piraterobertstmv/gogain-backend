const express = require('express');
const Transaction = require('../models/transaction');
const router = new express.Router();


router.post('/transaction', async (req, res, next) => {
    const transaction = new Transaction(req.body);

    try {
        await transaction.save();
        res.status(201).send({ transaction });
    } catch(e) {
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
        const processedTransactions = transactions.map(transaction => {
            // Create a copy of the transaction to avoid mutating the original
            const processedTransaction = { ...transaction };
            
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
        });
        
        // Create and save all transactions
        const savedTransactions = await Transaction.insertMany(processedTransactions);
        
        res.status(201).send({ transactions: savedTransactions });
    } catch(e) {
        console.error('Error in batch transaction creation:', e);
        res.status(400).send(e);
    }
});

module.exports = router;
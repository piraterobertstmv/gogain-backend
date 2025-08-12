const express = require('express');
const Transaction = require('../models/transaction');
const authentification = require('../middlewares/authentification');
const { 
    requirePermission, 
    filterDataByUserAccess 
} = require('../middlewares/permissions');
const router = new express.Router();

// Get last transaction index - Requires authentication and view permission
router.get('/transactions/last-index', authentification, requirePermission('transactions', 'view'), async (req, res, next) => {
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
        res.status(500).send({ message: 'Error fetching last transaction index' });
    }
});

// Create new transaction - Requires authentication and create permission
router.post('/transaction', authentification, requirePermission('transactions', 'create'), async (req, res, next) => {
    const transaction = new Transaction(req.body);

    // Check if user has access to the center and service in the transaction
    if (transaction.centerName && !req.user.canAccessCenter(transaction.centerName)) {
        return res.status(403).json({
            message: 'Access denied. You don\'t have permission to create transactions for this center.',
            center: transaction.centerName,
            userCenters: req.user.assignedCenters
        });
    }

    if (transaction.serviceName && !req.user.canAccessService(transaction.serviceName)) {
        return res.status(403).json({
            message: 'Access denied. You don\'t have permission to create transactions for this service.',
            service: transaction.serviceName,
            userServices: req.user.assignedServices
        });
    }

    try {
        await transaction.save();
        res.status(201).send({ transaction });
    } catch(e) {
        console.error('Error creating transaction:', e);
        res.status(400).send({ message: 'Error creating transaction', error: e.message });
    }
});

// Get all transactions - Requires authentication and view permission
router.get('/transaction', authentification, requirePermission('transactions', 'view'), async (req, res, next) => {
    try {
        // Store original data for filtering
        req.originalData = { transactions: await Transaction.find({}) };
        
        // Filter data based on user access
        filterDataByUserAccess('transactions')(req, res, () => {
            const transactions = req.filteredData.transactions || [];
            
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
        });
    } catch(e) {
        console.error('Error fetching transactions:', e);
        res.status(500).send({ message: 'Error fetching transactions' });
    }
});

// Get specific transaction - Requires authentication and view permission
router.get('/transaction/:id', authentification, requirePermission('transactions', 'view'), async (req, res, next) => {
    const transactionId = req.params.id;

    try {
        const transaction = await Transaction.findOne({ _id: transactionId });
        
        if (!transaction) {
            return res.status(404).send({ error: 'Transaction not found' });
        }

        // Check if user has access to this transaction's center and service
        if (transaction.centerName && !req.user.canAccessCenter(transaction.centerName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to view this transaction.',
                center: transaction.centerName,
                userCenters: req.user.assignedCenters
            });
        }

        if (transaction.serviceName && !req.user.canAccessService(transaction.serviceName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to view this transaction.',
                service: transaction.serviceName,
                userServices: req.user.assignedServices
            });
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
        res.status(500).send({ message: 'Error fetching transaction' });
    }
});

// Update transaction - Requires authentication and edit permission
router.patch('/transaction/:id', authentification, requirePermission('transactions', 'edit'), async (req, res, next) => {
    const transactionId = req.params.id;
    const transactionModified = req.body;

    try {
        // First check if user has access to the existing transaction
        const existingTransaction = await Transaction.findOne({ _id: transactionId });
        if (!existingTransaction) {
            return res.status(404).send({ error: 'Transaction not found' });
        }

        // Check access to existing transaction
        if (existingTransaction.centerName && !req.user.canAccessCenter(existingTransaction.centerName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to edit this transaction.',
                center: existingTransaction.centerName,
                userCenters: req.user.assignedCenters
            });
        }

        if (existingTransaction.serviceName && !req.user.canAccessService(existingTransaction.serviceName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to edit this transaction.',
                service: existingTransaction.serviceName,
                userServices: req.user.assignedServices
            });
        }

        // Check access to new center/service if being changed
        if (transactionModified.centerName && !req.user.canAccessCenter(transactionModified.centerName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to assign this center.',
                center: transactionModified.centerName,
                userCenters: req.user.assignedCenters
            });
        }

        if (transactionModified.serviceName && !req.user.canAccessService(transactionModified.serviceName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to assign this service.',
                service: transactionModified.serviceName,
                userServices: req.user.assignedServices
            });
        }

        await Transaction.updateOne({ _id: transactionId }, { $set: transactionModified });
        const updatedTransaction = await Transaction.findById(transactionId);
        res.status(200).send({ transactionId, updatedTransaction });
    } catch(e) {
        console.error('Error updating transaction:', e);
        res.status(500).send({ message: 'Error updating transaction' });
    }
});

// Delete transaction - Requires authentication and delete permission
router.delete('/transaction/:id', authentification, requirePermission('transactions', 'delete'), async (req, res, next) => {
    const transactionId = req.params.id;

    try {
        // First check if user has access to the transaction
        const existingTransaction = await Transaction.findOne({ _id: transactionId });
        if (!existingTransaction) {
            return res.status(404).send({ error: 'Transaction not found' });
        }

        // Check access to existing transaction
        if (existingTransaction.centerName && !req.user.canAccessCenter(existingTransaction.centerName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to delete this transaction.',
                center: existingTransaction.centerName,
                userCenters: req.user.assignedCenters
            });
        }

        if (existingTransaction.serviceName && !req.user.canAccessService(existingTransaction.serviceName)) {
            return res.status(403).json({
                message: 'Access denied. You don\'t have permission to delete this transaction.',
                service: existingTransaction.serviceName,
                userServices: req.user.assignedServices
            });
        }

        const deleteInfos = await Transaction.deleteOne({ _id: transactionId });
        res.status(200).send({ transactionId, deleteInfos });
    } catch(e) {
        console.error('Error deleting transaction:', e);
        res.status(500).send({ message: 'Error deleting transaction' });
    }
});

// Batch create transactions - Requires authentication and create permission
router.post('/transactions/batch', authentification, requirePermission('transactions', 'create'), async (req, res, next) => {
    try {
        // Expect an array of transaction objects in the request body
        const { transactions, options } = req.body;
        
        if (!Array.isArray(transactions)) {
            return res.status(400).send({ error: 'Expected an array of transactions' });
        }

        // Validate access to all centers and services in the batch
        for (const transaction of transactions) {
            if (transaction.centerName && !req.user.canAccessCenter(transaction.centerName)) {
                return res.status(403).json({
                    message: 'Access denied. You don\'t have permission to create transactions for center: ' + transaction.centerName,
                    center: transaction.centerName,
                    userCenters: req.user.assignedCenters
                });
            }

            if (transaction.serviceName && !req.user.canAccessService(transaction.serviceName)) {
                return res.status(403).json({
                    message: 'Access denied. You don\'t have permission to create transactions for service: ' + transaction.serviceName,
                    service: transaction.serviceName,
                    userServices: req.user.assignedServices
                });
            }
        }
        
        // Map original names to the proper fields for storage in the database
        const processedTransactions = transactions.map(transaction => {
            // Create a copy of the transaction to avoid mutating the original
            const processedTransaction = { ...transaction };
            
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
        });
        
        // Create and save all transactions
        const savedTransactions = await Transaction.insertMany(processedTransactions);
        
        res.status(201).send({ 
            transactions: savedTransactions, 
            insertedCount: savedTransactions.length
        });
    } catch(e) {
        console.error('Error in batch transaction creation:', e);
        res.status(500).send({ message: 'Error in batch transaction creation', error: e.message });
    }
});

module.exports = router;
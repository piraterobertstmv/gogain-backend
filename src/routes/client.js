const express = require('express');
const Client = require('../models/client');
const authentification = require('../middlewares/authentification');
const { 
    requirePermission, 
    filterDataByUserAccess 
} = require('../middlewares/permissions');
const router = new express.Router();

// Create new client - Requires authentication and create permission
router.post('/client', authentification, requirePermission('clients', 'create'), async (req, res, next) => {
    const client = new Client(req.body);

    try {
        await client.save();
        res.status(201).send({ client });
    } catch(e) {
        console.error('Error creating client:', e);
        res.status(400).send({ message: 'Error creating client', error: e.message });
    }
});

// Get all clients - Requires authentication and view permission
router.get('/client', authentification, requirePermission('clients', 'view'), async (req, res, next) => {
    try {
        console.log('Fetching clients...');
        
        // Store original data for filtering
        req.originalData = { clients: await Client.find({}) };
        
        // Filter data based on user access
        filterDataByUserAccess('clients')(req, res, () => {
            const clients = req.filteredData.clients || [];
            console.log('Found clients:', clients.length);
            console.log('First client (if any):', clients[0]);
            res.status(200).send({ client: clients });
        });
    } catch(e) {
        console.error('Error fetching clients:', e);
        res.status(500).send({ message: 'Error fetching clients' });
    }
});

// Get specific client - Requires authentication and view permission
router.get('/client/:id', authentification, requirePermission('clients', 'view'), async (req, res, next) => {
    const clientId = req.params.id;

    try {
        const client = await Client.findOne({ _id: clientId });
        
        if (!client) {
            return res.status(404).send({ error: 'Client not found' });
        }
        
        res.status(200).send({ client });
    } catch(e) {
        console.error('Error fetching client:', e);
        res.status(500).send({ message: 'Error fetching client' });
    }
});

// Update client - Requires authentication and edit permission
router.patch('/client/:id', authentification, requirePermission('clients', 'edit'), async (req, res, next) => {
    const clientId = req.params.id;
    const clientModified = req.body;

    try {
        await Client.updateOne({ _id: clientId }, { $set: clientModified });
        const updatedClient = await Client.findById(clientId);
        res.status(200).send({ clientId, updatedClient });
    } catch(e) {
        console.error('Error updating client:', e);
        res.status(500).send({ message: 'Error updating client' });
    }
});

// Delete specific client - Requires authentication and delete permission
router.delete('/client/:id', authentification, requirePermission('clients', 'delete'), async (req, res, next) => {
    const clientId = req.params.id;

    try {
        const deleteInfos = await Client.deleteOne({ _id: clientId });
        res.status(200).send({ clientId, deleteInfos });
    } catch(e) {
        console.error('Error deleting client:', e);
        res.status(500).send({ message: 'Error deleting client' });
    }
});

// Delete all clients - Requires authentication and delete permission (dangerous operation)
router.delete('/client', authentification, requirePermission('clients', 'delete'), async (req, res, next) => {
    try {
        const deleteInfos = await Client.deleteMany();
        res.status(200).send({ deleteInfos });
    } catch(e) {
        console.error('Error deleting all clients:', e);
        res.status(500).send({ message: 'Error deleting all clients' });
    }
});

module.exports = router;
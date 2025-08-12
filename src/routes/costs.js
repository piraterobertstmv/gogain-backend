const express = require('express');
const Costs = require('../models/costs');
const authentification = require('../middlewares/authentification');
const { 
    requirePermission, 
    filterDataByUserAccess 
} = require('../middlewares/permissions');
const router = new express.Router();

// Create new costs - Requires authentication and create permission
router.post('/costs', authentification, requirePermission('costs', 'create'), async (req, res, next) => {
    const costs = new Costs(req.body);

    try {
        await costs.save();
        res.status(201).send({ costs });
    } catch(e) {
        console.error('Error creating costs:', e);
        res.status(400).send({ message: 'Error creating costs', error: e.message });
    }
});

// Get all costs - Requires authentication and view permission
router.get('/costs', authentification, requirePermission('costs', 'view'), async (req, res, next) => {
    try {
        // Store original data for filtering
        req.originalData = { costs: await Costs.find({}) };
        
        // Filter data based on user access
        filterDataByUserAccess('costs')(req, res, () => {
            const costs = req.filteredData.costs || [];
            res.status(200).send({ costs });
        });
    } catch(e) {
        console.error('Error fetching costs:', e);
        res.status(500).send({ message: 'Error fetching costs' });
    }
});

// Get specific costs - Requires authentication and view permission
router.get('/costs/:id', authentification, requirePermission('costs', 'view'), async (req, res, next) => {
    const costsId = req.params.id;

    try {
        const costs = await Costs.findOne({ _id: costsId });
        
        if (!costs) {
            return res.status(404).send({ error: 'Costs not found' });
        }
        
        res.status(200).send({ costs });
    } catch(e) {
        console.error('Error fetching costs:', e);
        res.status(500).send({ message: 'Error fetching costs' });
    }
});

// Update costs - Requires authentication and edit permission
router.patch('/costs/:id', authentification, requirePermission('costs', 'edit'), async (req, res, next) => {
    const costsId = req.params.id;
    const costsModified = req.body;

    try {
        await Costs.updateOne({ _id: costsId }, { $set: costsModified });
        const updatedCosts = await Costs.findById(costsId);
        res.status(200).send({ costsId, updatedCosts });
    } catch(e) {
        console.error('Error updating costs:', e);
        res.status(500).send({ message: 'Error updating costs' });
    }
});

// Delete costs - Requires authentication and delete permission
router.delete('/costs/:id', authentification, requirePermission('costs', 'delete'), async (req, res, next) => {
    const costsId = req.params.id;

    try {
        const deleteInfos = await Costs.deleteOne({ _id: costsId });
        res.status(200).send({ costsId, deleteInfos });
    } catch(e) {
        console.error('Error deleting costs:', e);
        res.status(500).send({ message: 'Error deleting costs' });
    }
});

module.exports = router; 
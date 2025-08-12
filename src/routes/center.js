const express = require('express');
const Center = require('../models/center');
const authentification = require('../middlewares/authentification');
const { 
    requirePermission, 
    filterDataByUserAccess 
} = require('../middlewares/permissions');
const router = new express.Router();

// Create new center - Requires authentication and create permission
router.post('/center', authentification, requirePermission('centers', 'create'), async (req, res, next) => {
    const center = new Center(req.body);

    try {
        await center.save();
        res.status(201).send({ center });
    } catch(e) {
        console.error('Error creating center:', e);
        res.status(400).send({ message: 'Error creating center', error: e.message });
    }
});

// Get all centers - Requires authentication and view permission
router.get('/center', authentification, requirePermission('centers', 'view'), async (req, res, next) => {
    try {
        // Store original data for filtering
        req.originalData = { centers: await Center.find({}) };
        
        // Filter data based on user access
        filterDataByUserAccess('centers')(req, res, () => {
            const centers = req.filteredData.centers || [];
            res.status(200).send({ center: centers });
        });
    } catch(e) {
        console.error('Error fetching centers:', e);
        res.status(500).send({ message: 'Error fetching centers' });
    }
});

// Get specific center - Requires authentication and view permission
router.get('/center/:id', authentification, requirePermission('centers', 'view'), async (req, res, next) => {
    const centerId = req.params.id;

    try {
        const center = await Center.findOne({ _id: centerId });
        
        if (!center) {
            return res.status(404).send({ error: 'Center not found' });
        }
        
        res.status(200).send({ center });
    } catch(e) {
        console.error('Error fetching center:', e);
        res.status(500).send({ message: 'Error fetching center' });
    }
});

// Update center - Requires authentication and edit permission
router.patch('/center/:id', authentification, requirePermission('centers', 'edit'), async (req, res, next) => {
    const centerId = req.params.id;
    const centerModified = req.body;

    try {
        await Center.updateOne({ _id: centerId }, { $set: centerModified });
        const updatedCenter = await Center.findById(centerId);
        res.status(200).send({ centerId, updatedCenter });
    } catch(e) {
        console.error('Error updating center:', e);
        res.status(500).send({ message: 'Error updating center' });
    }
});

// Delete center - Requires authentication and delete permission
router.delete('/center/:id', authentification, requirePermission('centers', 'delete'), async (req, res, next) => {
    const centerId = req.params.id;

    try {
        const deleteInfos = await Center.deleteOne({ _id: centerId });
        res.status(200).send({ centerId, deleteInfos });
    } catch(e) {
        console.error('Error deleting center:', e);
        res.status(500).send({ message: 'Error deleting center' });
    }
});

module.exports = router;
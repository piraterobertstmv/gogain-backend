const express = require('express');
const Service = require('../models/service');
const authentification = require('../middlewares/authentification');
const { 
    requirePermission, 
    filterDataByUserAccess 
} = require('../middlewares/permissions');
const router = new express.Router();

// Create new service - Requires authentication and create permission
router.post('/service', authentification, requirePermission('services', 'create'), async (req, res, next) => {
    const service = new Service(req.body);

    try {
        await service.save();
        res.status(201).send({ service });
    } catch(e) {
        console.error('Error creating service:', e);
        res.status(400).send({ message: 'Error creating service', error: e.message });
    }
});

// Get all services - Requires authentication and view permission
router.get('/service', authentification, requirePermission('services', 'view'), async (req, res, next) => {
    try {
        // Store original data for filtering
        req.originalData = { services: await Service.find({}) };
        
        // Filter data based on user access
        filterDataByUserAccess('services')(req, res, () => {
            const services = req.filteredData.services || [];
            res.status(200).send({ service: services });
        });
    } catch(e) {
        console.error('Error fetching services:', e);
        res.status(500).send({ message: 'Error fetching services' });
    }
});

// Get specific service - Requires authentication and view permission
router.get('/service/:id', authentification, requirePermission('services', 'view'), async (req, res, next) => {
    const serviceId = req.params.id;

    try {
        const service = await Service.findOne({ _id: serviceId });
        
        if (!service) {
            return res.status(404).send({ error: 'Service not found' });
        }
        
        res.status(200).send({ service });
    } catch(e) {
        console.error('Error fetching service:', e);
        res.status(500).send({ message: 'Error fetching service' });
    }
});

// Update service - Requires authentication and edit permission
router.patch('/service/:id', authentification, requirePermission('services', 'edit'), async (req, res, next) => {
    const serviceId = req.params.id;
    const serviceModified = req.body;

    try {
        await Service.updateOne({ _id: serviceId }, { $set: serviceModified });
        const updatedService = await Service.findById(serviceId);
        res.status(200).send({ serviceId, updatedService });
    } catch(e) {
        console.error('Error updating service:', e);
        res.status(500).send({ message: 'Error updating service' });
    }
});

// Delete service - Requires authentication and delete permission
router.delete('/service/:id', authentification, requirePermission('services', 'delete'), async (req, res, next) => {
    const serviceId = req.params.id;

    try {
        const deleteInfos = await Service.deleteOne({ _id: serviceId });
        res.status(200).send({ serviceId, deleteInfos });
    } catch(e) {
        console.error('Error deleting service:', e);
        res.status(500).send({ message: 'Error deleting service' });
    }
});

module.exports = router;
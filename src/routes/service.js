const express = require('express');
const Service = require('../models/service');
const router = new express.Router();


router.post('/service', async (req, res, next) => {
    const service = new Service(req.body);

    try {
        await service.save();
        res.status(201).send({ service });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/service', async (req, res, next) => {
    try {
        const service = await Service.find({});
        res.status(201).send({ service });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/service/:id', async (req, res, next) => {
    const serviceId = req.params.id;

    try {
        const service = await Service.findOne({ _id: serviceId });
        res.status(201).send({ service });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.patch('/service/:id', async (req, res, next) => {
    const serviceId = req.params.id;
    const serviceModified = req.body;

    try {
        await Service.updateOne({ _id: serviceId }, { $set: serviceModified });
        const updatedService = await Service.find({ _id: serviceId });
        res.status(201).send({ serviceId, updatedService });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/service/:id', async (req, res, next) => {
    const serviceId = req.params.id;

    try {
        const deleteInfos = await Service.deleteOne({ _id: serviceId });
        res.status(201).send({ serviceId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

module.exports = router;
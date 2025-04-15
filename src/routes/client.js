const express = require('express');
const Client = require('../models/client');
const router = new express.Router();


router.post('/client', async (req, res, next) => {
    const client = new Client(req.body);

    try {
        await client.save();
        res.status(201).send({ client });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/client', async (req, res, next) => {
    try {
        console.log('Fetching clients...');
        const client = await Client.find({});
        console.log('Found clients:', client.length);
        console.log('First client (if any):', client[0]);
        res.status(200).send({ client });
    } catch(e) {
        console.error('Error fetching clients:', e);
        res.status(400).send(e);
    }
});

router.get('/client/:id', async (req, res, next) => {
    const clientId = req.params.id;

    try {
        const client = await Client.findOne({ _id: clientId });
        res.status(201).send({ client });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.patch('/client/:id', async (req, res, next) => {
    const clientId = req.params.id;
    const clientModified = req.body;

    try {
        await Client.updateOne({ _id: clientId }, { $set: clientModified });
        const updatedClient = await Client.find({ _id: clientId });
        res.status(201).send({ clientId, updatedClient });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/client/:id', async (req, res, next) => {
    const clientId = req.params.id;

    try {
        const deleteInfos = await Client.deleteOne({ _id: clientId });
        res.status(201).send({ clientId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/client', async (req, res, next) => {
    try {
        const deleteInfos = await Client.deleteMany();
        res.status(201).send({ clientId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

module.exports = router;
const express = require('express');
const Center = require('../models/center');
const router = new express.Router();

router.post('/center', async (req, res, next) => {
    const center = new Center(req.body);

    try {
        await center.save();
        res.status(201).send({ center });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/center', async (req, res, next) => {
    try {
        const center = await Center.find({});
        res.status(201).send({ center });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/center/:id', async (req, res, next) => {
    const centerId = req.params.id;

    try {
        const center = await Center.findOne({ _id: centerId });
        res.status(201).send({ center });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.patch('/center/:id', async (req, res, next) => {
    const centerId = req.params.id;
    const centerModified = req.body;

    try {
        await Center.updateOne({ _id: centerId }, { $set: centerModified });
        const updatedCenter = await Center.find({ _id: centerId });
        res.status(201).send({ centerId, updatedCenter });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/center/:id', async (req, res, next) => {
    const centerId = req.params.id;

    try {
        const deleteInfos = await Center.deleteOne({ _id: centerId });
        res.status(201).send({ centerId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

module.exports = router;
const express = require('express');
const Costs = require('../models/costs');
const authentification = require('../middlewares/authentification');
const router = new express.Router();

router.post('/costs', authentification, async (req, res, next) => {
    const costs = new Costs(req.body);

    try {
        await costs.save();
        res.status(201).send({ costs });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/costs', authentification, async (req, res, next) => {
    try {
        const costs = await Costs.find({});
        res.status(201).send({ costs });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/costs/:id', authentification, async (req, res, next) => {
    const costsId = req.params.id;

    try {
        const costs = await Costs.findOne({ _id: costsId });
        res.status(201).send({ costs });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.patch('/costs/:id', authentification, async (req, res, next) => {
    const costsId = req.params.id;
    const costsModified = req.body;

    try {
        await Costs.updateOne({ _id: costsId }, { $set: costsModified });
        const updatedCosts = await Costs.find({ _id: costsId });
        res.status(201).send({ costsId, updatedCosts });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/costs/:id', authentification, async (req, res, next) => {
    const costsId = req.params.id;

    try {
        const deleteInfos = await Costs.deleteOne({ _id: costsId });
        res.status(201).send({ costsId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

module.exports = router; 
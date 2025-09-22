const express = require('express');
const CostTransaction = require('../models/costTransaction');
const authentification = require('../middlewares/authentification');
const router = new express.Router();

// Get all cost transactions
router.get('/costs', async (req, res, next) => {
    try {
        const costs = await CostTransaction.find({});
        res.status(200).send({ costs });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Create a new cost transaction
router.post('/costs', authentification, async (req, res, next) => {
    try {
        const costTransaction = new CostTransaction(req.body);
        await costTransaction.save();
        res.status(201).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Get cost transaction by ID
router.get('/costs/:id', async (req, res, next) => {
    const costId = req.params.id;
    try {
        const costTransaction = await CostTransaction.findById(costId);
        if (!costTransaction) {
            return res.status(404).send({ error: 'Cost transaction not found' });
        }
        res.status(200).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Update cost transaction by ID
router.patch('/costs/:id', authentification, async (req, res, next) => {
    try {
        const costTransaction = await CostTransaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!costTransaction) {
            return res.status(404).send({ error: 'Cost transaction not found' });
        }
        res.status(200).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Delete cost transaction by ID
router.delete('/costs/:id', authentification, async (req, res, next) => {
    try {
        const costTransaction = await CostTransaction.findByIdAndDelete(req.params.id);
        if (!costTransaction) {
            return res.status(404).send({ error: 'Cost transaction not found' });
        }
        res.status(200).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

module.exports = router;

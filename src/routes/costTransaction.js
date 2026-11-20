const express = require('express');
const CostTransaction = require('../models/costTransaction');
const authentification = require('../middlewares/authentification');
const { ownershipFilter, sanitizeTransactionBody } = require('../services/ownership');
const { BadRequest, buildTransactionFilter, parsePaging, isPagedRequest } = require('../services/query');
const router = new express.Router();

// Get cost transactions (admins: all, regular users: their own)
router.get('/cost-transactions', authentification, async (req, res, next) => {
    try {
        // lean() skips the model's toJSON, so drop `index` here the same way toJSON did
        const filter = buildTransactionFilter(req);

        // Paged: ?page=0&limit=100 (+ center/client/worker/service/from/to filters)
        if (isPagedRequest(req.query)) {
            const { page, limit, skip } = parsePaging(req.query);
            const [costs, total] = await Promise.all([
                CostTransaction.find(filter, { index: 0 }).sort({ date: 1, _id: 1 }).skip(skip).limit(limit).lean(),
                CostTransaction.countDocuments(filter)
            ]);
            return res.status(200).send({ costs, total, page, limit });
        }

        const costs = await CostTransaction.find(filter, { index: 0 }).sort({ date: 1, _id: 1 }).lean();
        res.status(200).send({ costs });
    } catch(e) {
        if (e instanceof BadRequest) return res.status(400).send({ message: e.message });
        res.status(400).send(e);
    }
});

// Create a new cost transaction
router.post('/cost-transactions', authentification, async (req, res, next) => {
    try {
        const costTransaction = new CostTransaction(sanitizeTransactionBody(req, req.body, { isCreate: true }));
        await costTransaction.save();
        res.status(201).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Get cost transaction by ID
router.get('/cost-transactions/:id', authentification, async (req, res, next) => {
    try {
        const costTransaction = await CostTransaction.findOne({ _id: req.params.id, ...ownershipFilter(req) });
        if (!costTransaction) {
            return res.status(404).send({ error: 'Cost transaction not found' });
        }
        res.status(200).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Update cost transaction by ID
router.patch('/cost-transactions/:id', authentification, async (req, res, next) => {
    try {
        const costTransaction = await CostTransaction.findOneAndUpdate(
            { _id: req.params.id, ...ownershipFilter(req) },
            sanitizeTransactionBody(req, req.body, { isCreate: false }),
            { new: true, runValidators: true }
        );
        if (!costTransaction) {
            return res.status(404).send({ error: 'Cost transaction not found' });
        }
        res.status(200).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

// Delete cost transaction by ID
router.delete('/cost-transactions/:id', authentification, async (req, res, next) => {
    try {
        const costTransaction = await CostTransaction.findOneAndDelete({ _id: req.params.id, ...ownershipFilter(req) });
        if (!costTransaction) {
            return res.status(404).send({ error: 'Cost transaction not found' });
        }
        res.status(200).send({ costTransaction });
    } catch(e) {
        res.status(400).send(e);
    }
});

module.exports = router;

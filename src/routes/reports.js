// Report totals computed in MongoDB, so the frontend no longer downloads every transaction.
//
// GET /reports/aggregate?from=YYYY-MM-DD&to=YYYY-MM-DD&by=center|worker|service&period=month|day
//                       &center=id1,id2&worker=id1,id2
//
// Response: { rows: [{ center|worker|service?, period?, type: "revenue"|"cost", amount, count }] }
//   - amount is EXCLUDING taxes: cost / (1 + taxes/100)   (taxes is a percentage)
//   - costs = transactions with typeOfTransaction "cost" + every cost transaction
//   - periods are UTC: "2026-03" (month) or "2026-03-05" (day)
//   - regular users only get totals for their own records (same rule as the lists)
const express = require('express');
const Transaction = require('../models/transaction');
const CostTransaction = require('../models/costTransaction');
const authentification = require('../middlewares/authentification');
const { BadRequest, buildTransactionFilter } = require('../services/query');
const router = new express.Router();

const GROUP_FIELDS = ['center', 'worker', 'service'];
const PERIOD_FORMATS = { month: '%Y-%m', day: '%Y-%m-%d' };

// cost / (1 + taxes/100), falling back to cost when taxes is missing or nonsensical
const NET_AMOUNT = {
    $let: {
        vars: {
            cost: { $ifNull: ['$cost', 0] },
            taxes: { $ifNull: ['$taxes', 0] }
        },
        in: {
            $cond: [
                { $gt: ['$$taxes', -100] },
                { $divide: ['$$cost', { $add: [1, { $divide: ['$$taxes', 100] }] }] },
                '$$cost'
            ]
        }
    }
};

router.get('/reports/aggregate', authentification, async (req, res) => {
    try {
        const { by, period } = req.query;
        if (by !== undefined && !GROUP_FIELDS.includes(by)) throw new BadRequest(`"by" must be one of ${GROUP_FIELDS.join(', ')}`);
        if (period !== undefined && !PERIOD_FORMATS[period]) throw new BadRequest('"period" must be "month" or "day"');

        const match = buildTransactionFilter(req);
        const project = (typeExpr) => ({ $project: { center: 1, worker: 1, service: 1, date: 1, type: typeExpr, amount: NET_AMOUNT } });

        const pipeline = [
            { $match: match },
            project({
                $switch: {
                    branches: [
                        { case: { $eq: ['$typeOfTransaction', 'revenue'] }, then: 'revenue' },
                        { case: { $eq: ['$typeOfTransaction', 'cost'] }, then: 'cost' }
                    ],
                    default: null
                }
            }),
            {
                $unionWith: {
                    coll: CostTransaction.collection.name,
                    pipeline: [{ $match: match }, project({ $literal: 'cost' })]
                }
            },
            { $match: { type: { $ne: null } } },
            {
                $group: {
                    _id: {
                        group: by ? `$${by}` : null,
                        period: period ? { $dateToString: { format: PERIOD_FORMATS[period], date: '$date', timezone: 'UTC' } } : null,
                        type: '$type'
                    },
                    amount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.period': 1, '_id.group': 1 } }
        ];

        const groups = await Transaction.aggregate(pipeline);

        const rows = groups.map(g => ({
            ...(by ? { [by]: g._id.group } : {}),
            ...(period ? { period: g._id.period } : {}),
            type: g._id.type,
            amount: Math.round(g.amount * 100) / 100,
            count: g.count
        }));

        res.status(200).send({ rows });
    } catch (e) {
        if (e instanceof BadRequest) return res.status(400).send({ message: e.message });
        console.error('Error aggregating report:', e);
        res.status(500).send({ message: 'Failed to compute report' });
    }
});

module.exports = router;

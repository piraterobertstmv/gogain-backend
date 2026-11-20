const mongoose = require('mongoose');
const validator = require('validator');

const transactionSchema = new mongoose.Schema({
    index: {
        type: Number,
        default: 1
    },
    date: {
        type: Date,
        required: true
    },
    center: {
        type: String,
        required: true
    },
    centerName: {
        type: String
    },
    client: {
        type: String,
        required: true
    },
    clientName: {
        type: String
    },
    cost: {
        type: Number,
        required: true
    },
    worker: {
        type: String,
        required: true
    },
    taxes: {
        type: Number,
        required: true
    },
    typeOfTransaction: {
        type: String,
        required: true
    },
    typeOfMovement: {
        type: String,
        required: true
    },
    frequency: {
        type: String,
        required: true
    },
    typeOfClient: {
        type: String,
        required: true
    },
    service: {
        type: String,
        required: true
    },
    serviceName: {
        type: String
    }
});

transactionSchema.methods.toJSON = function() {
    const transaction = this.toObject();
    
    // Exclude the redundant index field from API responses
    delete transaction.index;
    
    return transaction;
}

// Indexes for date-range reports and paged lists (by worker for regular users, by center for filters)
transactionSchema.index({ date: 1 });
transactionSchema.index({ worker: 1, date: 1 });
transactionSchema.index({ center: 1, date: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
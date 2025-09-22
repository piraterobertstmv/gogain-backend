const mongoose = require('mongoose');
const validator = require('validator');

const costTransactionSchema = new mongoose.Schema({
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

costTransactionSchema.methods.toJSON = function() {
    const costTransaction = this.toObject();
    
    // Exclude the redundant index field from API responses
    delete costTransaction.index;
    
    return costTransaction;
}

const CostTransaction = mongoose.model('CostTransaction', costTransactionSchema);

module.exports = CostTransaction;

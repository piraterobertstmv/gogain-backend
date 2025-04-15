const mongoose = require('mongoose');
const validator = require('validator');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    cost: {
        type: Number,
        required: true
    },
    tax: {
        type: Number,
        required: true
    }
});

serviceSchema.methods.toJSON = function() {
    const service = this.toObject();
    return service;
}


const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
const mongoose = require('mongoose');
const validator = require('validator');

const clientSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    secondaryPhoneNumber: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        trim: true
    },
    birthdate: {
        type: Date,
    },
    zipcode: {
        type: Number,
    },
    city: {
        type: String,
    },
    address: {
        type: String,
    }
}, {
    collection: 'clients'  // Explicitly set the collection name
});

clientSchema.methods.toJSON = function() {
    const client = this.toObject();
    return client;
}

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
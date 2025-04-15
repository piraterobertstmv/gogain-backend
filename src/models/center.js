const mongoose = require('mongoose');
const validator = require('validator');

const centerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }
});

centerSchema.methods.toJSON = function() {
    const center = this.toObject();
    return center;
}


const Center = mongoose.model('Center', centerSchema);

module.exports = Center;
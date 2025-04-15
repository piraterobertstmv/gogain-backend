const mongoose = require('mongoose');

const costsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }
});

costsSchema.methods.toJSON = function() {
    const costs = this.toObject();
    return costs;
}

const Costs = mongoose.model('Costs', costsSchema);

module.exports = Costs; 
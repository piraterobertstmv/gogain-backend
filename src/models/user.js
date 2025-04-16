const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) throw new Error('E-mail non valide');
        }
    },
    password: {
        type: String,
        validate(value) {
            if (!validator.isLength(value, { min: 4, max: 80 } )) throw new Error('Le mot de passe doit etre entre 4 et 20 chars');
        }
    },
    authTokens: [{
        authToken: {
            type: String,
            required: true
        }
    }],
    isAdmin: {
        type: Boolean,
    },
    centers: {
        type: [String],
        required: true
    },
    services : {
        type: [String],
        required: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    percentage: {
        type: Number,
        required: true
    }
});

userSchema.methods.toJSON = function() {
    const user = this.toObject();

    delete user.password;
    delete user.authTokens;

    return user;
}

userSchema.methods.generateAuthTokenAndSaveUser = async function() {
    const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, { expiresIn: '24h' });
    this.authTokens.push({ authToken: token });
    await this.save();
    return token;
}

userSchema.statics.findUser = async(email, password) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Erreur, pas possible de se connecter!');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error('Error, pas possible de se connecter!');

    return user;
}

userSchema.pre('save', async function() {
    if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 8);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
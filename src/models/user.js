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
            if (!validator.isLength(value, { min: 8, max: 80 } )) throw new Error('Password must be between 8 and 80 characters');
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

    // Drop expired/invalid tokens so the array doesn't grow forever
    this.authTokens = this.authTokens.filter(({ authToken }) => {
        try {
            jwt.verify(authToken, process.env.JWT_SECRET);
            return true;
        } catch (e) {
            return false;
        }
    });

    this.authTokens.push({ authToken: token });
    await this.save();
    return token;
}

userSchema.statics.findUser = async(email, password) => {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
        throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    return user;
}

userSchema.pre('save', async function() {
    if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 8);
});

// Every authenticated request looks the user up by token
userSchema.index({ 'authTokens.authToken': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
const express = require('express');
const User = require('../models/user');
const authentification = require('../middlewares/authentification');
const { requireAdmin } = require('../middlewares/authentification');
const router = new express.Router();

// Fields an admin may set on a user. Anything else in the body is ignored
// (prevents writing authTokens, _id, etc. through the API).
const ADMIN_EDITABLE_FIELDS = ['email', 'password', 'firstName', 'lastName', 'isAdmin', 'centers', 'services', 'percentage'];
// Fields a regular user may change on their own account.
const SELF_EDITABLE_FIELDS = ['password'];

function pick(source, fields) {
    const result = {};
    fields.forEach(field => {
        if (source[field] !== undefined) result[field] = source[field];
    });
    return result;
}

function sendUserError(res, e, fallbackMessage) {
    if (e.name === 'ValidationError') {
        const errors = {};
        for (const field in e.errors) {
            errors[field] = e.errors[field].message;
        }
        return res.status(400).send({ message: 'Validation failed', errors });
    }
    if (e.code === 11000) {
        return res.status(400).send({ message: 'Email is already in use' });
    }
    if (e.name === 'CastError') {
        return res.status(400).send({ message: 'Invalid user id' });
    }
    console.error(fallbackMessage, e);
    res.status(500).send({ message: fallbackMessage });
}

// Create a user (admin only)
router.post('/users', authentification, requireAdmin, async (req, res) => {
    try {
        const user = new User(pick(req.body, ADMIN_EDITABLE_FIELDS));
        if (!user.password) {
            return res.status(400).send({ message: 'Validation failed', errors: { password: 'Password is required' } });
        }
        await user.save();
        res.status(201).send({ user });
    } catch(e) {
        sendUserError(res, e, 'Error creating user');
    }
});

// List users (any authenticated user — needed to display worker names).
// toJSON strips password and authTokens.
router.get('/users', authentification, async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).send({ users });
    } catch(e) {
        sendUserError(res, e, 'Error fetching users');
    }
});

// Update a user. Admins can edit anyone; regular users can only change their own password.
router.patch('/users/:id', authentification, async (req, res) => {
    const userId = req.params.id;
    const isSelf = req.user._id.toString() === userId;
    const isAdmin = req.user.isAdmin === true;

    if (!isAdmin && !isSelf) {
        return res.status(403).send({ message: 'You can only modify your own account' });
    }

    try {
        const user = isSelf ? req.user : await User.findById(userId);
        if (!user) return res.status(404).send({ message: 'User not found' });

        const updates = pick(req.body, isAdmin ? ADMIN_EDITABLE_FIELDS : SELF_EDITABLE_FIELDS);
        if (updates.password === '') delete updates.password;

        Object.assign(user, updates);
        await user.save(); // runs validators and the password-hashing hook

        res.status(200).send({ userId, updatedUser: [user] });
    } catch(e) {
        sendUserError(res, e, 'Error updating user');
    }
});

// Delete a user (admin only, not yourself)
router.delete('/users/:id', authentification, requireAdmin, async (req, res) => {
    const userId = req.params.id;

    if (req.user._id.toString() === userId) {
        return res.status(400).send({ message: 'You cannot delete your own account' });
    }

    try {
        const deleteInfos = await User.deleteOne({ _id: userId });
        res.status(200).send({ userId, deleteInfos });
    } catch(e) {
        sendUserError(res, e, 'Error deleting user');
    }
});

router.post('/users/login', async (req, res) => {
    try {
        if (!req.body.email || !req.body.password) {
            return res.status(400).send({ message: 'Email and password are required' });
        }

        const user = await User.findUser(req.body.email, req.body.password);
        const authToken = await user.generateAuthTokenAndSaveUser();

        res.send({ user, authToken });
    } catch(e) {
        res.status(400).send({ message: 'Invalid email or password' });
    }
})

router.post('/users/logout', authentification, async (req, res) => {
    try {
        req.user.authTokens = req.user.authTokens.filter((authToken) => {
            return authToken.authToken !== req.authToken;
        });

        await req.user.save();
        res.send();
    } catch(e) {
        sendUserError(res, e, 'Error logging out');
    }
})

router.get('/users/me', authentification, async (req, res) => {
    res.send(req.user);
})

module.exports = router;

const express = require('express');
const User = require('../models/user');
const authentification = require('../middlewares/authentification');
const router = new express.Router();
const bcrypt = require('bcryptjs');

router.post('/users', async (req, res, next) => {
    const user = new User(req.body);

    try {
        const authToken = await user.generateAuthTokenAndSaveUser();
        res.status(201).send({ user, authToken });
    } catch(e) {
        console.error('Error creating user:', e);
        
        // Handle validation errors with more detailed messages
        if (e.name === 'ValidationError') {
            const errors = {};
            // Extract validation error messages
            for (const field in e.errors) {
                errors[field] = e.errors[field].message;
            }
            return res.status(400).send({ 
                message: 'Validation failed',
                errors 
            });
        }
        
        // Handle duplicate key (email) error
        if (e.code === 11000) {
            return res.status(400).send({ 
                message: 'Email is already in use' 
            });
        }
        
        // Generic error handling
        res.status(400).send({ 
            message: e.message || 'Error creating user'
        });
    }
});

router.get('/users', async (req, res, next) => {
    try {
        const users = await User.find({});
        res.status(201).send({ users });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.patch('/users/:id', async (req, res, next) => {
    const userId = req.params.id;
    const userModified = req.body;

    if (userModified.password) {
        userModified.password = await bcrypt.hash(userModified.password, 8);
    }

    try {
        await User.updateOne({ _id: userId }, { $set: userModified });
        const updatedUser = await User.find({ _id: userId });
        res.status(201).send({ userId, updatedUser });
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/users/:id', async (req, res, next) => {
    const userId = req.params.id;

    try {
        const deleteInfos = await User.deleteOne({ _id: userId });
        res.status(201).send({ userId, deleteInfos });
    } catch(e) {
        res.status(400).send(e);
    }
});

//router.get('/users', authentification, async (req, res, next) => {
//    try {
//        const users = await User.find({  });
//        res.send(users);
//    } catch(e) {
//        res.status(500).send(e);
//    }
//})
//
//router.get('/users/:id', async (req, res, next) => {
//    const userId = req.params.id;
//
//    try {
//        const user = await User.findById(userId);
//        if (!user) return res.status(404).send('User not found');
//        res.send(user);
//    } catch(e) {
//        res.status(500).send(e);
//    }
//})

// router.patch('/users/me', authentification, async (req, res, next) => {
//     const updatedInfo = Object.keys(req.body);

//     try {
//         updatedInfo.forEach(update => req.user[update] = req.body[update]);
//         await req.user.save();
//         res.send(req.user);
//     } catch(e) {
//         res.status(500).send(e);
//     }
// })

// router.delete('/users/me', authentification, async (req, res, next) => {
//     try {
//         await req.user.remove();
//         res.send(req.user);
//     } catch(e) {
//         res.status(500).send(e);
//     }
// })

router.post('/users/login', async (req, res) => {
    console.log(`Login attempt for email: ${req.body.email}`);
    try {
        if (!req.body.email || !req.body.password) {
            console.log('Missing email or password');
            return res.status(400).send({ message: 'Email and password are required' });
        }
        
        console.log('Finding user in database...');
        const user = await User.findUser(req.body.email, req.body.password);
        console.log(`User found: ${user._id}`);
        
        console.log('Generating auth token...');
        const authToken = await user.generateAuthTokenAndSaveUser();
        console.log('Auth token generated successfully');
        
        console.log(`Successful login for user: ${user.email} (${user._id})`);
        res.send({user, authToken});
    } catch(e) {
        console.log(`Failed login attempt for ${req.body.email}: ${e.message}`);
        res.status(400).send({ message: e.message || 'Login failed' });
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
        res.status(400).send(e);
    }
})

// router.post('/users/logout/all', authentification, async (req, res) => {
//     try {
//         req.user.authTokens = [];
//         await req.user.save();
//         res.send();
//     } catch(e) {
//         res.status(400).send(e);
//     }
// })

router.get('/users/me', authentification, async (req, res, next) => {
    res.send(req.user);
})

module.exports = router;
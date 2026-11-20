const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authentification = async(req, res, next) => {
    try {
        const header = req.header('Authorization') || '';
        const authToken = header.replace('Bearer ', '');
        if (!authToken) throw new Error('Missing token');

        const decodedToken = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decodedToken._id, 'authTokens.authToken': authToken });

        if (!user) throw new Error('Unknown token');

        req.authToken = authToken;
        req.user = user;
        next();
    } catch(e) {
        res.status(401).send({ message: 'Authentication required' });
    }
}

// Use after `authentification`.
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.isAdmin === true) return next();
    res.status(403).send({ message: 'Administrator access required' });
}

module.exports = authentification;
module.exports.requireAdmin = requireAdmin;

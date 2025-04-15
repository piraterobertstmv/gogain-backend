const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authentification = async(req, res, next) => {
    try {
        const authToken = req.header('Authorization').replace('Bearer ', '');
        const decodedToken = jwt.verify(authToken, 'foo');
        const user = await User.findOne({ _id: decodedToken._id, 'authTokens.authToken': authToken });

        if (!user) throw new Error(); 

        req.authToken = authToken;
        req.user = user;
        next();
    } catch(e) {
        res.status(401).send('Merci de vous identifier!');
    }
}

module.exports = authentification;
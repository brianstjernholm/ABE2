
import jwt from 'jsonwebtoken';
const jwt = require('jsonwebtoken')
const jwts = require('express-jwt')

isAuth = (req, res, next) => {
    const token = req.headers['x-auth-token'];
    if(!token || token ==='') {
        req.isAuth = false;
        return next();
    }
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    } catch(err) {
        req.isAuth = false;
        return next();
    };
    req.isAuth = true;
    req.appRoles = decodedToken.appRoles;
    req.userId = decodedToken.userId;
    next();
}
exports.isAuth                  
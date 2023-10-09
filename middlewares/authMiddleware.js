const asyncHandler = require("express-async-handler");
const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");

/**
 * Middleware to verify if a user is authenticated.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
    let token;

    if (req?.headers?.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decodedToken?.id);

            if (!user) {
                return res.status(401).json({ message: 'No user found with this token.' });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized or token expired. Please login again.' });
        }
    } else {
        return res.status(401).json({ message: 'No token attached to the header.' });
    }
});

/**
 * Middleware to verify if the authenticated user is an admin.
 */
const isAdmin = asyncHandler(async (req, res, next) => {
    if (req.user && (req.user.role.toLowerCase() === 'admin')) {
        next();
    } else {
        return res.status(403).json({ message: 'You are not an admin. Access denied.' });
    }
});

module.exports = { authMiddleware, isAdmin };

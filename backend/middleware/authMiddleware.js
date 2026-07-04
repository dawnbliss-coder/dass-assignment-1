const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); 
const User = require('../models/User'); 

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request, excluding password
      req.user = await User.findById(decoded.id).select('-password');

      next(); 
    } catch (error) {
      console.error(error);
      res.status(401); 
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Middleware for Organizer routes (Section 10)
const organizer = (req, res, next) => {
  if (req.user && req.user.role === 'organizer') {
    next();
  } else {
    res.status(403); // Forbidden is more accurate than 401 here
    throw new Error('Not authorized as an organizer');
  }
};

// Middleware for Admin routes (Section 11 & 12)
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403); 
    throw new Error('Not authorized as an admin');
  }
};

module.exports = { protect, organizer, admin };
// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import the User model
const asyncHandler = require('express-async-handler'); // Simple wrapper for async middleware

// This middleware protects routes by verifying a JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check if the Authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the header (e.g., "Bearer TOKEN_STRING" -> "TOKEN_STRING")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token using the JWT_SECRET from environment variables
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user by ID from the decoded token payload and attach it to the request object
      // .select('-password') excludes the password hash from the fetched user object
      req.user = await User.findById(decoded.id).select('-password');

      // If user is found, proceed to the next middleware or route handler
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      // If token verification fails, send a 401 Unauthorized response
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  // If no token is provided in the header
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Middleware for role-based access control (e.g., 'admin' only)
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Check if req.user exists (meaning protect middleware ran successfully)
    // and if the user's role is included in the allowed roles
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403); // 403 Forbidden status code
      throw new Error(`User role ${req.user ? req.user.role : 'unauthenticated'} is not authorized to access this route`);
    }
    next(); // If authorized, proceed
  };
};


module.exports = { protect, authorizeRoles }; // Export both middleware functions

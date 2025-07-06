    // server/middleware/auth.js

    const jwt = require('jsonwebtoken'); // For JWT token verification
    const asyncHandler = require('./async'); // Custom async handler middleware
    const ErrorResponse = require('../utils/errorResponse'); // Custom error response class
    const User = require('../models/User'); // User model for finding user by ID

    // Protect routes - Ensures user is logged in
    exports.protect = asyncHandler(async (req, res, next) => {
      let token;

      // Check if Authorization header exists and starts with 'Bearer'
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Extract token from header
        token = req.headers.authorization.split(' ')[1];
      }

      // If no token is provided, user is not authorized
      if (!token) {
        return next(new ErrorResponse('Not authorized to access this route', 401));
      }

      try {
        // Verify token using JWT_SECRET from environment variables
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by ID from decoded token payload
        req.user = await User.findById(decoded.id);

        // If user not found, return error
        if (!req.user) {
          return next(new ErrorResponse('No user found with this ID', 404));
        }

        // Proceed to the next middleware/route handler
        next();
      } catch (error) {
        console.error('Token verification error:', error);
        return next(new ErrorResponse('Not authorized to access this route', 401));
      }
    });

    // Authorize roles - Restricts access based on user role
    exports.authorizeRoles = (...roles) => {
      return (req, res, next) => {
        // Check if user's role is included in the allowed roles array
        if (!roles.includes(req.user.role)) {
          return next(new ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403));
        }
        // If authorized, proceed to the next middleware/route handler
        next();
      };
    };
    
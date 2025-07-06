    // backend/server/middleware/error.js

    const ErrorResponse = require('../utils/errorResponse'); // Import your custom error response class

    // Error handling middleware function
    const errorHandler = (err, req, res, next) => {
      let error = { ...err }; // Copy the error object
      error.message = err.message; // Ensure message is copied

      // Log to console for dev
      console.error('SERVER ERROR:', err.stack || err);

      // Mongoose bad ObjectId (e.g., /api/products/1234, where 1234 is not a valid MongoDB ID format)
      if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new ErrorResponse(message, 404);
      }

      // Mongoose duplicate key (e.g., trying to register with an existing email/username)
      if (err.code === 11000) {
        const message = `Duplicate field value entered: ${Object.keys(err.keyValue)} already exists.`;
        error = new ErrorResponse(message, 400);
      }

      // Mongoose validation error (e.g., missing required fields, invalid format)
      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new ErrorResponse(message.join(', '), 400);
      }

      // Send the error response
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
      });
    };

    module.exports = errorHandler; // Export the error handler middleware
    
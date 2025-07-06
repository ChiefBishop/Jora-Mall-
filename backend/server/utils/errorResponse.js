    // backend/server/utils/errorResponse.js

    // Custom ErrorResponse class that extends the built-in Error class
    class ErrorResponse extends Error {
      constructor(message, statusCode) {
        super(message); // Call the parent Error constructor with the message
        this.statusCode = statusCode; // Add a custom statusCode property
      }
    }

    module.exports = ErrorResponse; // Export the custom error class
    
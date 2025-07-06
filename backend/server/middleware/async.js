    // backend/server/middleware/async.js

    // This is a simple wrapper function to handle asynchronous Express route handlers.
    // It catches any errors that occur within the async function and passes them to the next middleware (error handler).
    const asyncHandler = fn => (req, res, next) =>
      Promise.resolve(fn(req, res, next)).catch(next);

    module.exports = asyncHandler;
    
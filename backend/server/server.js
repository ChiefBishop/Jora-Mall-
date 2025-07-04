// server/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan'); // HTTP request logger middleware
const cors = require('cors'); // CORS middleware
const path = require('path'); // Node.js path module for directory manipulation

// IMPORTANT: Load environment variables from .env file.
// Ensure your .env file is in a 'config' directory at the root of your server folder.
dotenv.config({ path: './config/config.env' });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI; // Retrieve URI here

// --- DEBUG LOGGING ---
console.log('DEBUG: MONGODB_URI being used (first 50 chars):', MONGODB_URI ? MONGODB_URI.substring(0, 50) + '...' : 'MONGODB_URI NOT SET');
console.log('DEBUG: MONGODB_URI full length:', MONGODB_URI ? MONGODB_URI.length : 0);
if (!MONGODB_URI || MONGODB_URI.includes('<') || MONGODB_URI.includes('>')) {
  console.error('CRITICAL DEBUG: MONGODB_URI appears to be invalid or contain unexpected characters!');
}
// --- END DEBUG LOGGING ---

// --- Middleware Setup ---
app.use(cors()); // Enable Cross-Origin Resource Sharing for all routes
app.use(express.json()); // Enable Express to parse JSON formatted request bodies

// Dev logging middleware (only runs in development environment)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// --- Connect to MongoDB using Mongoose ---
// This explicit connect block ensures routes are mounted only after DB is ready.
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');

    // --- Route Files (Require them AFTER MongoDB connection is established) ---
    // Ensure these paths are correct relative to server.js
    const authRoutes = require('./routes/auth');
    const productRoutes = require('./routes/products');
    const cartRoutes = require('./routes/cart');
    const orderRoutes = require('./routes/orders');
    const paystackRoutes = require('./routes/paystack');
    const walletRoutes = require('./routes/wallet'); // <--- DECLARATION OF walletRoutes HERE

    // --- Mount Routers (Associate routes with specific paths) ---
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/paystack', paystackRoutes);
    app.use('/api/wallet', walletRoutes); // <--- USAGE OF walletRoutes HERE

    // Basic root route for development to confirm backend is running
    app.get('/', (req, res) => {
      res.send('Jora Mall Backend API is running!');
    });

    // Error handling middleware (should be last middleware loaded, before app.listen)
    // Ensure this file exists at server/middleware/error.js
    const errorHandler = require('./middleware/error');
    app.use(errorHandler);


    // Start the Express server only after successful database connection
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections (e.g., database connection errors outside mongoose.connect)
    process.on('unhandledRejection', (err, promise) => {
      console.error(`Error (unhandledRejection): ${err.message}`);
      // Close server & exit process if an unhandled rejection occurs
      if (server) { // Check if server is defined before trying to close
        server.close(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

  })
  .catch(err => {
    // Log any MongoDB connection errors and exit the process
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit with a failure code
  });

// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// IMPORTANT: Load environment variables from .env file FIRST.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI; // Retrieve URI here

// >>> START DEBUG LOGGING <<<
console.log('DEBUG: MONGODB_URI being used (first 50 chars):', MONGODB_URI ? MONGODB_URI.substring(0, 50) + '...' : 'MONGODB_URI NOT SET');
console.log('DEBUG: MONGODB_URI full length:', MONGODB_URI ? MONGODB_URI.length : 0);
if (!MONGODB_URI || MONGODB_URI.includes('<') || MONGODB_URI.includes('>')) {
  console.error('CRITICAL DEBUG: MONGODB_URI appears to be invalid or contain unexpected characters!');
}
// >>> END DEBUG LOGGING <<<

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing for all routes
app.use(express.json()); // Enable Express to parse JSON formatted request bodies

// Connect to MongoDB using Mongoose
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');

    // IMPORTANT: Require and use routes *after* MongoDB connection is established.
    // This helps ensure that Mongoose models are properly initialized with an active connection.
    const productRoutes = require('./routes/productRoutes');
    const authRoutes = require('./routes/authRoutes');
    const cartRoutes = require('./routes/cartRoutes');
    const orderRoutes = require('./routes/orderRoutes');
    const paystackRoutes = require('./routes/paystackRoutes');

    // Mount API routes to their respective base paths
    app.use('/api/products', productRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/paystack', paystackRoutes); // Paystack integration routes
    app.use('/api/wallet', walletRoutes); 


    // Basic root route to confirm server is running
    app.get('/', (req, res) => {
      res.send('Jora Mall Backend API is running!');
    });

    // Start the Express server only after successful database connection
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    // Log any MongoDB connection errors and exit the process
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit with a failure code
  });

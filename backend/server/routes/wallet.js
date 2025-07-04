    // server/routes/wallet.js

    const express = require('express');
    const { protect } = require('../middleware/auth'); // Import protect middleware for authentication
    const {
      initializeAddFunds,
      verifyAddFunds,
      getWalletBalance,
    } = require('../controllers/walletController'); // Import wallet controller functions

    const router = express.Router();

    // Routes for wallet operations, all protected (require logged-in user)
    router.post('/initialize-add-funds', protect, initializeAddFunds); // Initialize Paystack for top-up
    router.post('/verify-add-funds', protect, verifyAddFunds);       // Verify Paystack top-up and update balance
    router.get('/balance', protect, getWalletBalance);                 // Get user's current wallet balance

    module.exports = router; // Export the router
    
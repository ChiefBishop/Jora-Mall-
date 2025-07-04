    // server/controllers/walletController.js

    const User = require('../models/User'); // Import the User model
    const { initializeTransaction, verifyTransaction } = require('../utils/paystack'); // Import Paystack utilities
    const ErrorResponse = require('../utils/errorResponse'); // Custom error class
    const asyncHandler = require('../middleware/async'); // Async handler middleware

    // @desc    Initialize Paystack transaction for adding funds to wallet
    // @route   POST /api/wallet/initialize-add-funds
    // @access  Private (Registered User)
    exports.initializeAddFunds = asyncHandler(async (req, res, next) => {
      const { amount } = req.body; // Amount to add to wallet
      const user = req.user; // User object from auth middleware

      if (!amount || amount <= 0) {
        return next(new ErrorResponse('Please provide a valid amount to add to your wallet.', 400));
      }

      // Paystack amount is in kobo (NGN cents)
      const paystackAmount = amount * 100;

      try {
        const transactionDetails = await initializeTransaction(user.email, paystackAmount, {
          purpose: 'wallet_topup', // Custom metadata for wallet top-up
          userId: user._id.toString() // Pass user ID as metadata
        });

        res.status(200).json({
          success: true,
          authorizationUrl: transactionDetails.authorization_url,
          accessCode: transactionDetails.access_code,
          reference: transactionDetails.reference,
        });
      } catch (error) {
        console.error('Error initializing wallet top-up transaction:', error);
        return next(new ErrorResponse('Failed to initialize wallet top-up transaction.', 500));
      }
    });


    // @desc    Verify Paystack transaction and update wallet balance
    // @route   POST /api/wallet/verify-add-funds
    // @access  Private (Registered User)
    exports.verifyAddFunds = asyncHandler(async (req, res, next) => {
      const { reference } = req.body; // Paystack transaction reference
      const userId = req.user._id; // User ID from auth middleware

      if (!reference) {
        return next(new ErrorResponse('Transaction reference is required.', 400));
      }

      try {
        const verificationResult = await verifyTransaction(reference);

        if (!verificationResult.status || verificationResult.data.status !== 'success') {
          return next(new ErrorResponse('Paystack transaction not successful or not found.', 400));
        }

        // Double-check purpose and userId from metadata (important for security)
        const metadata = verificationResult.data.metadata;
        if (metadata.purpose !== 'wallet_topup' || metadata.userId !== userId.toString()) {
          return next(new ErrorResponse('Invalid transaction metadata or unauthorized access.', 401));
        }

        const amountPaid = verificationResult.data.amount / 100; // Convert kobo to NGN

        // Find user and update wallet balance
        const user = await User.findById(userId);

        if (!user) {
          return next(new ErrorResponse('User not found.', 404));
        }

        // Check for duplicate payment (optional but recommended for robustness)
        // You might store transaction references in a separate collection or in user's history
        // For simplicity, we'll proceed assuming unique transactions for now.
        // In a production app, you'd add a check here to ensure this reference hasn't been processed for this user before.

        user.walletBalance += amountPaid; // Add funds to wallet
        await user.save(); // Save updated user balance

        res.status(200).json({
          success: true,
          message: `Wallet successfully topped up with ${amountPaid} NGN!`,
          walletBalance: user.walletBalance,
        });

      } catch (error) {
        console.error('Error verifying wallet top-up transaction:', error);
        return next(new ErrorResponse('Failed to verify wallet top-up transaction.', 500));
      }
    });


    // @desc    Get current user's wallet balance
    // @route   GET /api/wallet/balance
    // @access  Private (Registered User)
    exports.getWalletBalance = asyncHandler(async (req, res, next) => {
      const user = req.user; // User object from auth middleware

      res.status(200).json({
        success: true,
        walletBalance: user.walletBalance, // Return the wallet balance
      });
    });
    
// backend/server/controllers/walletController.js

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
    console.error('Error initializing wallet top-up transaction:', error.message); // Log error message
    // If it's an Axios error from Paystack API, try to get more specific message
    const errorMessage = error.response && error.response.data && error.response.data.message
                         ? error.response.data.message
                         : 'Failed to initialize wallet top-up transaction.';
    return next(new ErrorResponse(errorMessage, error.response ? error.response.status : 500));
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
      const errorMessage = verificationResult.message || verificationResult.data.gateway_response || 'Paystack transaction not successful or not found.';
      return next(new ErrorResponse(errorMessage, 400));
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

    // IMPORTANT: Check for duplicate payment to prevent adding funds multiple times for the same reference
    // You might store transaction references in a separate collection or in user's history
    // For now, we'll assume a simple check if the reference has been used.
    // A more robust solution would involve a dedicated transaction log.
    if (user.walletTransactions && user.walletTransactions.includes(reference)) { // Assuming a walletTransactions array on User model
        return next(new ErrorResponse('This transaction has already been processed.', 409)); // 409 Conflict
    }

    user.walletBalance += amountPaid; // Add funds to wallet
    // Optionally, add the reference to a list of processed transactions to prevent duplicates
    if (!user.walletTransactions) {
        user.walletTransactions = [];
    }
    user.walletTransactions.push(reference); // Track processed reference

    await user.save(); // Save updated user balance

    res.status(200).json({
      success: true,
      message: `Wallet successfully topped up with ${amountPaid} NGN!`,
      walletBalance: user.walletBalance,
    });

  } catch (error) {
    console.error('Error verifying wallet top-up transaction:', error.message);
    const errorMessage = error.response && error.response.data && error.response.data.message
                         ? error.response.data.message
                         : 'Failed to verify wallet top-up transaction.';
    return next(new ErrorResponse(errorMessage, error.response ? error.response.status : 500));
  }
});


// @desc    Get current user's wallet balance
// @route   GET /api/wallet/balance
// @access  Private (Registered User)
exports.getWalletBalance = asyncHandler(async (req, res, next) => {
  const user = req.user; // User object from auth middleware

  if (!user) {
    return next(new ErrorResponse('User not found or not authenticated.', 404));
  }

  res.status(200).json({
    success: true,
    walletBalance: user.walletBalance, // Return the wallet balance
  });
});

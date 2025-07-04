// server/utils/paystack.js

const axios = require('axios'); // Import axios for making HTTP requests
const dotenv = require('dotenv'); // Import dotenv to load environment variables

// Load environment variables (ensure this is done for this file too if it's run independently,
// but it's already done in server.js, so this is mostly for clarity/robustness)
dotenv.config({ path: '../config/config.env' }); // Adjust path if your config.env is elsewhere

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY; // Get Paystack secret key from environment variables

// Base URL for Paystack API
const PAYSTACK_API_BASE_URL = 'https://api.paystack.co';

// Function to initialize a new Paystack transaction
const initializeTransaction = async (email, amount, metadata = {}) => {
  try {
    const response = await axios.post(
      `${PAYSTACK_API_BASE_URL}/transaction/initialize`,
      {
        email: email,       // Customer's email address
        amount: amount,     // Amount in kobo (e.g., 10000 for NGN 100.00)
        metadata: metadata, // Custom metadata for tracking (e.g., orderId, purpose)
        // Add a callback URL if you want Paystack to redirect to a specific URL after payment
        // For our current setup, the frontend will handle the redirect after receiving authorizationUrl
        // callback_url: 'https://your-frontend-domain.com/order-confirmation',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, // Authorization header with secret key
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.data; // Return the transaction data from Paystack
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error.response ? error.response.data : error.message);
    throw new Error('Failed to initialize Paystack transaction');
  }
};

// Function to verify a Paystack transaction using its reference
const verifyTransaction = async (reference) => {
  try {
    const response = await axios.get(
      `${PAYSTACK_API_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, // Authorization header with secret key
        },
      }
    );
    return response.data; // Return the verification data from Paystack
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error.response ? error.response.data : error.message);
    throw new Error('Failed to verify Paystack transaction');
  }
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
};

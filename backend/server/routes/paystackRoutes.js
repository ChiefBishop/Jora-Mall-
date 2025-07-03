// server/routes/paystackRoutes.js
const express = require('express');
const router = express.Router();
const https = require('https'); // Node.js built-in HTTPS module for external API calls
const Order = require('../models/Order'); // Order model to update payment status
const { protect } = require('../middleware/authMiddleware'); // Auth middleware

// Make sure PAYSTACK_SECRET_KEY is loaded from .env
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error('PAYSTACK_SECRET_KEY is not set in environment variables!');
  // In a production app, you might want to throw an error here or disable payment features
}

// @desc    Initialize Paystack transaction
// @route   POST /api/paystack/initialize
// @access  Private (requires user to be logged in)
router.post('/initialize', protect, async (req, res) => {
  // `protect` middleware ensures req.user.id is available
  const { amount, email, orderId } = req.body; // amount in kobo, email is customer's, orderId is your internal order ID

  if (!amount || !email || !orderId) {
    return res.status(400).json({ message: 'Amount, email, and orderId are required.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  // Define options for the HTTPS request to Paystack's API
  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/transaction/initialize',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, // Use your Paystack Secret Key
      'Content-Type': 'application/json',
    },
  };

  let data = ''; // To accumulate response data from Paystack

  // Create an HTTPS request to Paystack
  const paystackReq = https.request(options, (paystackRes) => {
    paystackRes.on('data', (chunk) => {
      data += chunk;
    });

    paystackRes.on('end', () => {
      try {
        const responseData = JSON.parse(data);
        if (responseData.status) {
          // If Paystack initialization is successful, send back authorization URL to frontend
          res.status(200).json({ authorizationUrl: responseData.data.authorization_url });
        } else {
          // If Paystack returns an error, send it back
          console.error('Paystack Initialization Error:', responseData.message);
          res.status(400).json({ message: responseData.message || 'Paystack initialization failed.' });
        }
      } catch (e) {
        console.error('Error parsing Paystack response:', e);
        res.status(500).json({ message: 'Error processing Paystack response.' });
      }
    });
  });

  paystackReq.on('error', (error) => {
    console.error('Paystack Request Error:', error);
    res.status(500).json({ message: 'Could not connect to Paystack service.' });
  });

  // Write the request body (payload for Paystack)
  paystackReq.write(JSON.stringify({
    amount: amount, // Amount already in kobo (or cents for NGN)
    email: email,
    metadata: {
      order_id: orderId, // Pass your internal order ID as metadata
      user_id: req.user.id, // Pass user ID as metadata
    },
    callback_url: `http://localhost:3000/order-confirmation`, // URL Paystack redirects to after payment
  }));
  paystackReq.end(); // End the request
});

// @desc    Verify Paystack transaction
// @route   POST /api/paystack/verify
// @access  Private (called by frontend after redirect from Paystack)
router.post('/verify', protect, async (req, res) => {
  const { reference } = req.body; // Paystack transaction reference

  if (!reference) {
    return res.status(400).json({ message: 'Payment reference is required.' });
  }

  // Define options for the HTTPS request to Paystack's verification API
  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${encodeURIComponent(reference)}`, // Encode reference for URL
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  };

  let data = '';
  const paystackReq = https.request(options, (paystackRes) => {
    paystackRes.on('data', (chunk) => {
      data += chunk;
    });

    paystackRes.on('end', async () => {
      try {
        const responseData = JSON.parse(data);
        if (responseData.status && responseData.data.status === 'success') {
          const paystackMetadata = responseData.data.metadata;
          const orderId = paystackMetadata.order_id;
          const userId = paystackMetadata.user_id; // Retrieve user ID from metadata

          // Ensure the order belongs to the authenticated user for security
          if (userId !== req.user.id.toString()) {
            console.warn(`Security alert: Mismatch in user ID during payment verification. Token user: ${req.user.id}, Metadata user: ${userId}`);
            return res.status(403).json({ message: 'Access denied: Order does not belong to this user.' });
          }

          // Update the order status in your database
          const order = await Order.findById(orderId);
          if (!order) {
            return res.status(404).json({ message: 'Order not found in your database.' });
          }

          // Prevent double processing: only update if order is pending
          if (order.paymentStatus === 'pending') {
            order.paymentStatus = 'paid';
            order.status = 'completed'; // Mark order as completed if payment is successful
            order.paystackReference = reference; // Store Paystack reference
            await order.save();
            res.status(200).json({ message: 'Payment verified and order updated successfully.', order });
          } else {
            // Order was already paid/processed
            res.status(200).json({ message: 'Payment already processed for this order.', order });
          }

        } else {
          // Payment not successful or verification failed on Paystack's end
          console.error('Paystack Verification Failed:', responseData.message || responseData.data.gateway_response);
          res.status(400).json({ message: responseData.message || responseData.data.gateway_response || 'Paystack verification failed.' });
        }
      } catch (e) {
        console.error('Error parsing Paystack verification response or updating order:', e);
        res.status(500).json({ message: 'Error processing Paystack verification.' });
      }
    });
  });

  paystackReq.on('error', (error) => {
    console.error('Paystack Verification Request Error:', error);
    res.status(500).json({ message: 'Could not connect to Paystack verification service.' });
  });

  paystackReq.end(); // End the request
});

module.exports = router; // Export the router

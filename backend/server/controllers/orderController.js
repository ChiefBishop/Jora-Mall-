// server/controllers/orderController.js

const Order = require('../models/Order');     // Import the Order model
const Product = require('../models/Product');   // Import the Product model (needed for stock updates)
const User = require('../models/User');         // Import the User model (needed for wallet balance update)
const ErrorResponse = require('../utils/errorResponse'); // Custom error class
const asyncHandler = require('../middleware/async'); // Async handler middleware
const { initializeTransaction, verifyTransaction } = require('../utils/paystack'); // Paystack utilities

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private (Registered User)
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { items, totalAmount, shippingAddress, paymentMethod } = req.body;
  const userId = req.user._id; // User ID from the authenticated request

  if (!items || items.length === 0) {
    return next(new ErrorResponse('No order items provided.', 400));
  }
  if (!totalAmount || totalAmount <= 0) {
    return next(new ErrorResponse('Total amount must be positive.', 400));
  }
  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
    return next(new ErrorResponse('Please provide complete shipping address details.', 400));
  }

  // Find the user to update their cart (if using server-side cart) and potentially wallet
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found.', 404));
  }

  // Check if items are in stock and reduce stock
  for (const item of items) {
    const product = await Product.findById(item.product); // Assuming item.product is the product ID
    if (!product) {
      return next(new ErrorResponse(`Product not found: ${item.name}`, 404));
    }
    if (product.stock < item.quantity) {
      return next(new ErrorResponse(`Insufficient stock for ${product.name}. Only ${product.stock} available.`, 400));
    }
    // Reduce stock
    product.stock -= item.quantity;
    await product.save();
  }

  let orderPaymentStatus = 'pending'; // Default payment status
  let orderStatus = 'pending';        // Default order status
  let paystackReference = null;       // Default Paystack reference

  // --- NEW: Wallet Payment Logic ---
  if (paymentMethod === 'wallet') {
    if (user.walletBalance < totalAmount) {
      return next(new ErrorResponse('Insufficient wallet balance.', 400));
    }
    // Deduct from wallet
    user.walletBalance -= totalAmount;
    await user.save(); // Save updated wallet balance
    orderPaymentStatus = 'paid'; // Set payment status to paid if paid via wallet
    orderStatus = 'completed';   // Mark order as completed
    paystackReference = 'WALLET_PAYMENT'; // Custom reference for wallet payments
  }
  // --- END NEW: Wallet Payment Logic ---

  const order = await Order.create({
    user: userId,
    items,
    totalAmount,
    shippingAddress,
    paymentMethod: paymentMethod || 'paystack', // Default to paystack if not specified
    paymentStatus: orderPaymentStatus,
    status: orderStatus,
    paystackReference: paystackReference, // Set if paid via wallet
  });

  // Clear the user's cart after order creation (assuming a server-side cart for authenticated users)
  // This assumes you have a cart model/logic to clear the cart after order
  // If your cart is managed entirely in frontend or merged on login, this might not be needed.
  // Example: If you have a Cart model associated with the user, you'd clear it here:
  // await Cart.findOneAndDelete({ user: userId });
  // For now, let's assume `AuthContext` handles the cart clearing on the frontend after order confirmation.

  res.status(201).json({
    success: true,
    order,
  });
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private (Admin)
exports.getOrders = asyncHandler(async (req, res, next) => {
  // Build query based on filter
  const query = {};
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  }

  // Find orders and populate user and product details
  const orders = await Order.find(query)
    .populate('user', 'username email') // Populate user details (username and email)
    .populate('items.product', 'name imageUrl'); // Populate product name and imageUrl for items

  res.status(200).json(orders);
});

// @desc    Get single order by ID (Admin only)
// @route   GET /api/orders/:id
// @access  Private (Admin)
exports.getSingleOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'username email')
    .populate('items.product', 'name imageUrl');

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: order });
});

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res, next) => {
  // Find orders where the user field matches the authenticated user's ID
  const orders = await Order.find({ user: req.user._id })
    .populate('items.product', 'name imageUrl'); // Populate product name and imageUrl for items

  res.status(200).json(orders);
});


// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body; // New status from request body

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  // Validate the new status
  const validStatuses = ['pending', 'completed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return next(new ErrorResponse('Invalid order status provided.', 400));
  }

  order.status = status; // Update the order status
  await order.save(); // Save the updated order

  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    status: order.status // Return the new status
  });
});

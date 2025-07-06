// server/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');     // Order model
const Cart = require('../models/Cart');       // Cart model (to clear after order)
const Product = require('../models/Product'); // Product model (to update stock)
const { protect, authorizeRoles } = require('../middleware/auth'); // Auth middleware




// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
router.post('/', protect, async (req, res) => {
  const { items, shippingAddress, totalAmount } = req.body;

  // Basic validation
  if (!items || items.length === 0 || !shippingAddress || !totalAmount) {
    return res.status(400).json({ message: 'Missing required order details.' });
  }

  try {
    // 1. Validate product existence and sufficient stock for each item
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.name}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${item.name}. Available: ${product.stock}` });
      }
      // Ensure the price sent by frontend matches current product price in DB (prevent tampering)
      if (product.price.toFixed(2) !== item.price.toFixed(2)) {
         return res.status(400).json({ message: `Price mismatch for product: ${item.name}. Please refresh your cart.` });
      }
    }

    // 2. Create the new order
    const order = new Order({
      user: req.user.id,
      items: items.map(item => ({
        product: item.product,
        name: item.name,
        imageUrl: item.imageUrl,
        price: item.price,
        quantity: item.quantity
      })),
      shippingAddress,
      totalAmount,
      paymentStatus: 'pending', // Initial payment status
      status: 'pending',        // Initial order status
    });

    const createdOrder = await order.save();

    // 3. Decrease stock for each product
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // 4. Clear the user's cart after order creation
    await Cart.findOneAndDelete({ user: req.user.id });

    // Respond with the created order (Paystack will verify payment status later)
    res.status(201).json({ message: 'Order created successfully. Proceed to payment.', order: createdOrder });

  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ message: 'Server error while creating order.' });
  }
});

// @desc    Get current user's orders
// @route   GET /api/orders/my-orders
// @access  Private
router.get('/my-orders', protect, async (req, res) => {
  try {
    // Find all orders for the authenticated user, sorted by creation date (newest first)
    // Populate the product details within each order item for richer client display
    const orders = await Order.find({ user: req.user.id })
                                .sort({ createdAt: -1 }) // Sort by newest first
                                .populate('items.product', 'name price imageUrl'); // Populate product details

    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err.message);
    res.status(500).json({ message: 'Server error while fetching orders.' });
  }
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private (Admin only)
router.get('/', protect, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.query; // Allow filtering by status

    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // Find all orders, populate user (username, email) and product details
    const orders = await Order.find(query)
                                .sort({ createdAt: -1 })
                                .populate('user', 'username email') // Populate user details
                                .populate('items.product', 'name price imageUrl'); // Populate product details

    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching all orders (Admin):', err.message);
    res.status(500).json({ message: 'Server error while fetching all orders.' });
  }
});

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin only)
router.put('/:id/status', protect, authorizeRoles('admin'), async (req, res) => {
  const { status } = req.body; // New status to update to

  if (!status) {
    return res.status(400).json({ message: 'Order status is required.' });
  }

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Validate new status against allowed enum values
    const allowedStatuses = ['pending', 'completed', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status: ${status}. Allowed statuses are: ${allowedStatuses.join(', ')}` });
    }

    order.status = status;
    await order.save();

    res.status(200).json(order); // Return the updated order
  } catch (err) {
    console.error('Error updating order status:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid order ID format.' });
    }
    res.status(500).json({ message: 'Server error while updating order status.' });
  }
});

module.exports = router; // Export the router

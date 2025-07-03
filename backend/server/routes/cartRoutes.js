// server/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');     // Cart model
const Product = require('../models/Product'); // Product model to check stock and details
const { protect } = require('../middleware/authMiddleware'); // Auth middleware to protect routes

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Find the cart for the authenticated user and populate product details
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price imageUrl');

    if (!cart) {
      // If no cart found, return an empty cart object with 0 total amount
      return res.status(200).json({ items: [], totalAmount: 0, _id: null, user: req.user.id });
    }

    // Calculate the total amount of items in the cart
    // Use the denormalized price stored in the cart item itself for accuracy at time of adding
    const totalAmount = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Respond with the cart object and its calculated total amount
    res.status(200).json({ ...cart.toObject(), totalAmount });
  } catch (error) {
    console.error('Error fetching cart for user:', req.user.id, error);
    res.status(500).json({ message: 'Server error while fetching cart.' });
  }
});

// @desc    Add item to cart or update quantity if product already exists in cart
// @route   POST /api/cart
// @access  Private
router.post('/', protect, async (req, res) => {
  console.log('Received request to add to cart. User:', req.user.id, 'Data:', req.body);
  const { productId, quantity } = req.body;

  // Validate request body
  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Product ID and a valid quantity (greater than 0) are required.' });
  }

  try {
    // Find the product in the database to get its current details and stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if there is enough stock for the requested quantity
    if (product.stock < quantity) {
      return res.status(400).json({ message: `Not enough stock for ${product.name}. Available: ${product.stock}` });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ user: req.user.id });

    if (cart) {
      // If cart exists, check if the product is already in the cart
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

      if (itemIndex > -1) {
        // Product exists in cart, update its quantity
        const currentQuantityInCart = cart.items[itemIndex].quantity;
        const newTotalQuantity = currentQuantityInCart + quantity;

        // Ensure new total quantity does not exceed available stock
        if (product.stock < newTotalQuantity) {
          return res.status(400).json({ message: `Cannot add more ${product.name}. Max available to add: ${product.stock - currentQuantityInCart}.` });
        }
        cart.items[itemIndex].quantity = newTotalQuantity;
      } else {
        // Product not in cart, add new item
        cart.items.push({
          product: productId,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price, // Store current price (denormalization)
          quantity: quantity,
        });
      }
    } else {
      // If no cart exists for the user, create a new one
      cart = new Cart({
        user: req.user.id,
        items: [{
          product: productId,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          quantity: quantity,
        }],
      });
    }

    await cart.save(); // Save the updated or new cart

    // Populate the cart again to send back full product details to frontend
    const populatedCart = await Cart.findById(cart._id).populate('items.product', 'name price imageUrl');
    const totalAmount = populatedCart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    res.status(200).json({ ...populatedCart.toObject(), totalAmount });

  } catch (error) {
    console.error('Error adding/updating cart item for user:', req.user.id, error);
    res.status(500).json({ message: 'Server error while adding/updating cart item.' });
  }
});

// @desc    Update quantity of an item in cart
// @route   PUT /api/cart/:productId
// @access  Private
router.put('/:productId', protect, async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  // Validate new quantity
  if (quantity === undefined || quantity < 0) { // Allow 0 to indicate removal or setting to 0 before filtering
    return res.status(400).json({ message: 'A valid quantity (0 or greater) is required.' });
  }

  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found for this user.' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart to update.' });
    }

    if (quantity === 0) {
      // If quantity is 0, remove the item
      cart.items.splice(itemIndex, 1);
    } else {
      // Check stock if quantity is being increased
      const productInDb = await Product.findById(productId);
      if (!productInDb) {
        return res.status(404).json({ message: 'Original product not found in database.' });
      }
      if (productInDb.stock < quantity) {
        return res.status(400).json({ message: `Not enough stock for ${productInDb.name}. Available: ${productInDb.stock}.` });
      }
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    // Populate and calculate total before sending response
    const populatedCart = await Cart.findById(cart._id).populate('items.product', 'name price imageUrl');
    const totalAmount = populatedCart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    res.status(200).json({ ...populatedCart.toObject(), totalAmount });

  } catch (error) {
    console.error('Error updating cart item quantity for user:', req.user.id, error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }
    res.status(500).json({ message: 'Server error while updating cart item quantity.' });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  const { productId } = req.params;

  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found for this user.' });
    }

    const initialLength = cart.items.length;
    // Filter out the item to be removed
    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    // If the length didn't change, the product wasn't found in the cart
    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: 'Product not found in cart to remove.' });
    }

    await cart.save();

    // Populate and calculate total before sending response
    const populatedCart = await Cart.findById(cart._id).populate('items.product', 'name price imageUrl');
    const totalAmount = populatedCart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    res.status(200).json({ message: 'Product removed from cart successfully.', ...populatedCart.toObject(), totalAmount });

  } catch (error) {
    console.error('Error removing cart item for user:', req.user.id, error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid product ID format.' });
    }
    res.status(500).json({ message: 'Server error while removing cart item.' });
  }
});

// @desc    Clear user's entire cart
// @route   DELETE /api/cart
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      // If no cart found, it's already considered empty
      return res.status(200).json({ message: 'Cart is already empty or not found.', items: [], totalAmount: 0 });
    }

    cart.items = []; // Empty the items array
    await cart.save();

    res.status(200).json({ message: 'Cart cleared successfully.', items: [], totalAmount: 0 });

  } catch (error) {
    console.error('Error clearing cart for user:', req.user.id, error);
    res.status(500).json({ message: 'Server error while clearing cart.' });
  }
});

module.exports = router; // Export the router

// backend/server/controllers/cartController.js

const Cart = require('../models/Cart');     // Import the Cart model
const Product = require('../models/Product'); // Import the Product model to check stock and details
const ErrorResponse = require('../utils/errorResponse'); // Custom error class
const asyncHandler = require('../middleware/async'); // Middleware to wrap async route handlers and catch errors

// Helper function to calculate cart total amount
const calculateCartTotal = (cart) => {
  return cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res) => {
  // Find the cart for the authenticated user and populate product details
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price imageUrl');

  if (!cart) {
    // If no cart found, return an empty cart object with 0 total amount
    return res.status(200).json({ items: [], totalAmount: 0, _id: null, user: req.user.id });
  }

  // Calculate the total amount of items in the cart
  const totalAmount = calculateCartTotal(cart);

  // Respond with the cart object and its calculated total amount
  res.status(200).json({ ...cart.toObject(), totalAmount });
});

// @desc    Add item to cart or update quantity if product already exists in cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  // Validate request body
  if (!productId || !quantity || quantity <= 0) {
    return next(new ErrorResponse('Product ID and a valid quantity (greater than 0) are required.', 400));
  }

  // Find the product in the database to get its current details and stock
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorResponse('Product not found.', 404));
  }

  // Check if there is enough stock for the requested quantity
  if (product.stock < quantity) {
    return next(new ErrorResponse(`Not enough stock for ${product.name}. Available: ${product.stock}`, 400));
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
        return next(new ErrorResponse(`Cannot add more ${product.name}. Max available to add: ${product.stock - currentQuantityInCart}.`, 400));
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
  const totalAmount = calculateCartTotal(populatedCart);

  res.status(200).json({ ...populatedCart.toObject(), totalAmount });
});

// @desc    Update quantity of an item in cart
// @route   PUT /api/cart/:productId
// @access  Private
exports.updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  // Validate new quantity
  if (quantity === undefined || quantity < 0) { // Allow 0 to indicate removal or setting to 0 before filtering
    return next(new ErrorResponse('A valid quantity (0 or greater) is required.', 400));
  }

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new ErrorResponse('Cart not found for this user.', 404));
  }

  const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

  if (itemIndex === -1) {
    return next(new ErrorResponse('Product not found in cart to update.', 404));
  }

  if (quantity === 0) {
    // If quantity is 0, remove the item
    cart.items.splice(itemIndex, 1);
  } else {
    // Check stock if quantity is being increased
    const productInDb = await Product.findById(productId);
    if (!productInDb) {
      return next(new ErrorResponse('Original product not found in database.', 404));
    }
    if (productInDb.stock < quantity) {
      return next(new ErrorResponse(`Not enough stock for ${productInDb.name}. Available: ${productInDb.stock}.`, 400));
    }
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();

  // Populate and calculate total before sending response
  const populatedCart = await Cart.findById(cart._id).populate('items.product', 'name price imageUrl');
  const totalAmount = calculateCartTotal(populatedCart);

  res.status(200).json({ ...populatedCart.toObject(), totalAmount });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
exports.removeCartItem = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new ErrorResponse('Cart not found for this user.', 404));
  }

  const initialLength = cart.items.length;
  // Filter out the item to be removed
  cart.items = cart.items.filter(item => item.product.toString() !== productId);

  // If the length didn't change, the product wasn't found in the cart
  if (cart.items.length === initialLength) {
    return next(new ErrorResponse('Product not found in cart to remove.', 404));
  }

  await cart.save();

  // Populate and calculate total before sending response
  const populatedCart = await Cart.findById(cart._id).populate('items.product', 'name price imageUrl');
  const totalAmount = calculateCartTotal(populatedCart);

  res.status(200).json({ message: 'Product removed from cart successfully.', ...populatedCart.toObject(), totalAmount });
});

// @desc    Clear user's entire cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    // If no cart found, it's already considered empty
    return res.status(200).json({ message: 'Cart is already empty or not found.', items: [], totalAmount: 0 });
  }

  cart.items = []; // Empty the items array
  await cart.save();

  res.status(200).json({ message: 'Cart cleared successfully.', items: [], totalAmount: 0 });
});

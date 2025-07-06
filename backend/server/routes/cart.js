    // server/routes/cart.js

    const express = require('express');
    const router = express.Router();
    const { protect } = require('../middleware/auth'); // Auth middleware
    const {
      getCart,
      addToCart,
      updateCartItemQuantity,
      removeCartItem,
      clearCart,
    } = require('../controllers/cartController'); // Import cart controller functions

    // All cart routes are protected, requiring authentication
    router.route('/')
      .get(protect, getCart)      // Get user's cart
      .post(protect, addToCart)   // Add item to cart
      .delete(protect, clearCart); // Clear user's cart

    router.route('/:productId')
      .put(protect, updateCartItemQuantity) // Update quantity of item in cart
      .delete(protect, removeCartItem);     // Remove item from cart

    module.exports = router;
    
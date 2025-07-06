// server/routes/products.js

const express = require('express');
const router = express.Router();
// Import product controller functions - THIS IS THE KEY CHANGE
const {
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/auth'); // Auth middleware

// Public routes
router.route('/').get(getProducts); // Uses function from productController
router.route('/:id').get(getProduct); // Uses function from productController

// Admin-only routes (protected and authorized)
router.route('/').post(protect, authorizeRoles('admin'), addProduct); // Uses function from productController
router.route('/:id')
  .put(protect, authorizeRoles('admin'), updateProduct) // Uses function from productController
  .delete(protect, authorizeRoles('admin'), deleteProduct); // Uses function from productController

module.exports = router;

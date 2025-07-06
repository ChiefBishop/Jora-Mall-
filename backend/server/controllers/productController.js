// backend/server/controllers/productController.js

const Product = require('../models/Product'); // Import the Product model
const ErrorResponse = require('../utils/errorResponse'); // Custom error class for consistent error handling
const asyncHandler = require('../middleware/async'); // Middleware to wrap async route handlers and catch errors

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  // Build query object for filtering based on request query parameters
  const query = {};

  // Search by name or description (case-insensitive regex)
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) {
      query.price.$gte = parseFloat(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      query.price.$lte = parseFloat(req.query.maxPrice);
    }
  }

  // Pagination setup
  const page = parseInt(req.query.page) || 1; // Current page number, default to 1
  const limit = parseInt(req.query.limit) || 12; // Number of products per page, default to 12
  const skip = (page - 1) * limit; // Number of documents to skip

  // Execute query to find products with pagination
  const products = await Product.find(query)
    .skip(skip)
    .limit(limit);

  // Get total count of products matching the query (for pagination metadata)
  const totalProducts = await Product.countDocuments(query);
  const totalPages = Math.ceil(totalProducts / limit);

  // Send successful response with products and pagination metadata
  res.status(200).json({
    success: true,
    count: products.length,
    totalProducts,
    totalPages,
    page,
    limit,
    products,
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  // If product not found, return a 404 error
  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  // Send successful response with the product data
  res.status(200).json({ success: true, data: product });
});

// @desc    Add new product
// @route   POST /api/products
// @access  Private (Admin only)
exports.addProduct = asyncHandler(async (req, res) => {
  // Destructure product fields from request body
  const { name, description, price, category, imageUrl, stock } = req.body;

  // Basic validation for required fields
  if (!name || !description || !price || !category || !imageUrl || stock === undefined) {
    return res.status(400).json({ message: 'Please include all product fields: name, description, price, category, imageUrl, and stock.' });
  }

  const product = await Product.create({
    name,
    description,
    price,
    category,
    imageUrl,
    stock,
    user: req.user.id, // Assign product to the creating admin user (from req.user set by auth middleware)
  });

  // Send successful response with the newly created product
  res.status(201).json({ success: true, data: product });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  // If product not found, return a 404 error
  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  // Update the product document in the database
  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated document instead of the original
    runValidators: true, // Run schema validators on update operation
  });

  // Send successful response with the updated product
  res.status(200).json({ success: true, data: product });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  // If product not found, return a 404 error
  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  // Delete the product document from the database
  await product.deleteOne(); // Using deleteOne() as findByIdAndDelete() is deprecated

  // Send successful response with no content (or an empty data object)
  res.status(200).json({ success: true, data: {} });
});

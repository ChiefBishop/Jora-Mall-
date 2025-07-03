// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // Product model
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Auth middleware

// @desc    Get all products (with search, filter, pagination)
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const query = {};

    // Build search query
    if (search) {
      // Case-insensitive search on name and description
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build category filter
    if (category) {
      query.category = { $regex: category, $options: 'i' }; // Case-insensitive category match
    }

    // Build price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Count total products matching the query for pagination
    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip(skip)   // Skip documents for pagination
      .limit(limitNum); // Limit number of documents per page

    res.json({
      products,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum),
      totalProducts,
    });
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ message: 'Server error while fetching products.' });
  }
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error fetching product by ID:', err.message);
    // Check for invalid ID format
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    res.status(500).json({ message: 'Server error while fetching product.' });
  }
});

// @desc    Add new product
// @route   POST /api/products
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('admin'), async (req, res) => {
  const { name, description, price, imageUrl, category, stock } = req.body;

  // Basic validation for required fields
  if (!name || !description || !price || !category || stock === undefined || stock === null) {
    return res.status(400).json({ message: 'Please fill all required fields: name, description, price, category, stock.' });
  }
  if (price < 0 || stock < 0) {
    return res.status(400).json({ message: 'Price and stock cannot be negative.' });
  }

  try {
    // Check if a product with the same name already exists
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({ message: 'A product with this name already exists.' });
    }

    const product = new Product({
      name,
      description,
      price,
      imageUrl,
      category,
      stock,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (err) {
    console.error('Error adding product:', err.message);
    res.status(500).json({ message: 'Server error while adding product.' });
  }
});

// @desc    Update product by ID
// @route   PUT /api/products/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), async (req, res) => {
  const { name, description, price, imageUrl, category, stock } = req.body;

  // Basic validation for updated fields if provided
  if (price !== undefined && price < 0) {
    return res.status(400).json({ message: 'Price cannot be negative.' });
  }
  if (stock !== undefined && stock < 0) {
    return res.status(400).json({ message: 'Stock cannot be negative.' });
  }

  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if updating name would conflict with an existing product (excluding itself)
    if (name && name !== product.name) {
      const existingProduct = await Product.findOne({ name });
      if (existingProduct && existingProduct._id.toString() !== req.params.id) {
        return res.status(400).json({ message: 'A product with this name already exists.' });
      }
    }

    // Update product fields if they are provided in the request body
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price !== undefined ? price : product.price; // Allow price to be 0
    product.imageUrl = imageUrl !== undefined ? imageUrl : product.imageUrl; // Allow imageUrl to be empty string
    product.category = category || product.category;
    product.stock = stock !== undefined ? stock : product.stock; // Allow stock to be 0

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (err) {
    console.error('Error updating product:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    res.status(500).json({ message: 'Server error while updating product.' });
  }
});

// @desc    Delete product by ID
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorizeRoles('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product removed successfully' });
  } catch (err) {
    console.error('Error deleting product:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    res.status(500).json({ message: 'Server error while deleting product.' });
  }
});

module.exports = router; // Export the router

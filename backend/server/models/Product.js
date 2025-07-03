// server/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true, // Ensure product names are unique
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0, // Price cannot be negative
  },
  imageUrl: {
    type: String,
    required: false, // Image URL is optional
    default: 'https://placehold.co/400x300/E0E0E0/333333?text=No+Image', // Default placeholder image
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  stock: {
    type: Number,
    required: true,
    min: 0, // Stock cannot be negative
    default: 0,
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Create the Product model from the schema
const Product = mongoose.model('Product', productSchema);

module.exports = Product; // Export the Product model

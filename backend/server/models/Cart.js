// server/models/Cart.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the Product model
    ref: 'Product', // The model name to which this path refers
    required: true,
  },
  name: { // Denormalized field for convenience (product name at time of adding to cart)
    type: String,
    required: true,
  },
  imageUrl: { // Denormalized field for convenience
    type: String,
    required: false,
  },
  price: { // Denormalized field for convenience (product price at time of adding to cart)
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1, // Quantity must be at least 1
    default: 1,
  },
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the User model
    ref: 'User', // The model name to which this path refers
    required: true,
    unique: true, // Each user should have only one cart
  },
  items: [cartItemSchema], // Array of embedded cartItemSchema documents
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Create the Cart model from the schema
const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart; // Export the Cart model

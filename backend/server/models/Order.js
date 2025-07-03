// server/models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { // Denormalized product name
    type: String,
    required: true,
  },
  imageUrl: { // Denormalized product image
    type: String,
    required: false,
  },
  price: { // Denormalized product price at time of order
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User who placed the order
    required: true,
  },
  items: [orderItemSchema], // Array of products in the order
  shippingAddress: {
    type: shippingAddressSchema,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'Paystack', // Assuming Paystack is the primary payment method
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'], // Status of the payment
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'shipped', 'delivered', 'cancelled'], // Status of the order lifecycle
    default: 'pending',
  },
  paystackReference: { // Store the Paystack transaction reference
    type: String,
    required: false, // Becomes required if paymentStatus is 'paid'
    unique: true, // Ensure unique transaction references
    sparse: true // Allows multiple documents to have a null value for this field
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Create the Order model from the schema
const Order = mongoose.model('Order', orderSchema);

module.exports = Order; // Export the Order model

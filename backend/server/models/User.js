// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure usernames are unique
    trim: true,   // Remove whitespace from both ends of a string
  },
  email: {
    type: String,
    required: true,
    unique: true, // Ensure emails are unique
    trim: true,
    lowercase: true, // Store emails in lowercase for consistency
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // Define allowed roles (e.g., 'user', 'admin')
    default: 'user', // Default role for new users if not specified
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

// Mongoose pre-save hook: Hash the password before saving the user document
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  // This prevents re-hashing an already hashed password on subsequent saves
  if (!this.isModified('password')) {
    next(); // Move to the next middleware/save operation
    return; // Exit function
  }

  // Generate a salt with 10 rounds (cost factor)
  const salt = await bcrypt.genSalt(10);
  // Hash the user's password using the generated salt
  this.password = await bcrypt.hash(this.password, salt);
  next(); // Move to the next middleware/save operation
});

// Custom method to compare an entered password with the hashed password in the database
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Use bcrypt.compare to securely compare the plain text entered password with the hashed one
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create the User model from the schema
const User = mongoose.model('User', userSchema);

module.exports = User; // Export the User model

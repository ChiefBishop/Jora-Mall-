// // server/models/User.js
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: true,
//     unique: true, // Ensure usernames are unique
//     trim: true,   // Remove whitespace from both ends of a string
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true, // Ensure emails are unique
//     trim: true,
//     lowercase: true, // Store emails in lowercase for consistency
//   },
//   password: {
//     type: String,
//     required: true,
//   },
//   role: {
//     type: String,
//     enum: ['user', 'admin'], // Define allowed roles (e.g., 'user', 'admin')
//     default: 'user', // Default role for new users if not specified
//   },
// }, {
//   timestamps: true, // Automatically add createdAt and updatedAt fields
// });

// // Mongoose pre-save hook: Hash the password before saving the user document
// userSchema.pre('save', async function (next) {
//   // Only hash the password if it has been modified (or is new)
//   // This prevents re-hashing an already hashed password on subsequent saves
//   if (!this.isModified('password')) {
//     next(); // Move to the next middleware/save operation
//     return; // Exit function
//   }

//   // Generate a salt with 10 rounds (cost factor)
//   const salt = await bcrypt.genSalt(10);
//   // Hash the user's password using the generated salt
//   this.password = await bcrypt.hash(this.password, salt);
//   next(); // Move to the next middleware/save operation
// });

// // Custom method to compare an entered password with the hashed password in the database
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   // Use bcrypt.compare to securely compare the plain text entered password with the hashed one
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // Create the User model from the schema
// const User = mongoose.model('User', userSchema);

// module.exports = User; // Export the User model



// server/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'], // Username is required
    unique: true, // Each username must be unique
    trim: true, // Trim whitespace from username
    minlength: [3, 'Username must be at least 3 characters long'], // Minimum length for username
  },
  email: {
    type: String,
    required: [true, 'Please add an email'], // Email is required
    unique: true, // Each email must be unique
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, // Regex for email validation
      'Please add a valid email', // Error message for invalid email format
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'], // Password is required
    minlength: [6, 'Password must be at least 6 characters long'], // Minimum length for password
    select: false, // Do not return password in query results by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // Role can only be 'user' or 'admin'
    default: 'user', // Default role is 'user'
  },
  // New field: Wallet Balance
  walletBalance: {
    type: Number,
    default: 0, // Default balance is 0
    min: 0, // Wallet balance cannot be negative
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set creation timestamp
  },
});

// Middleware to hash password before saving the user
UserSchema.pre('save', async function (next) {
  // Only hash the password if it's new or has been modified
  if (!this.isModified('password')) {
    next(); // Move to the next middleware
  }
  // Generate a salt (random string) with 10 rounds for strong hashing
  const salt = await bcrypt.genSalt(10);
  // Hash the password using the generated salt
  this.password = await bcrypt.hash(this.password, salt);
  next(); // Move to the next middleware
});

// Method to compare entered password with hashed password in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // Use bcrypt to compare the entered password with the stored hashed password
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); // Export the User model

// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For password comparison (though hashing is in User model pre-save hook)
const jwt = require('jsonwebtoken'); // For generating JWT tokens
const User = require('../models/User'); // User model to interact with MongoDB

// Log JWT_SECRET at module load time for debugging server startup issues related to .env
console.log('JWT_SECRET at authRoutes module level (first 10 chars):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'Not Set');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Basic server-side validation for required fields
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    // Check if a user with the given email already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create a new user instance with the provided data
    user = new User({
      username,
      email,
      password, // The password will be hashed automatically by the pre-save hook in User.js
    });

    // Save the new user to the database
    await user.save();

    // Log JWT_SECRET before token generation (for debugging registration flow)
    console.log('JWT_SECRET (Register context) (first 10 chars):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'Not Set');

    // Generate a JWT token for the newly registered user
    const token = jwt.sign(
      { id: user._id, role: user.role }, // Payload: user's ID and role
      process.env.JWT_SECRET,            // Secret key from environment variables
      { expiresIn: process.env.JWT_EXPIRE || '1h' } // Token expiration time (e.g., 30 days or 1 hour default)
    );

    // Respond with a success message, the generated token, and relevant user details
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    // Handle server errors during registration (e.g., database issues)
    console.error('Error during registration:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('--- Login Attempt Received ---');
    console.log('Attempting login for email:', email);

    // Basic server-side validation for required fields
    if (!email || !password) {
      console.log('Login attempt: Email or password not provided.');
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    // 1. Find the user in the database by their email
    const user = await User.findOne({ email });
    if (!user) {
      // If user not found, send an error response (invalid credentials to prevent enumeration)
      console.log('Login attempt: User not found for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('Login attempt: User found. User email:', user.email);
    // Log parts of the hashed password and provided password for debugging
    console.log('Login attempt: User password hash (first 10 chars):', user.password ? user.password.substring(0, 10) + '...' : 'undefined/null');
    console.log('Login attempt: Provided password (first 5 chars):', password ? password.substring(0, 5) + '...' : 'undefined/null');


    // 2. Compare the provided plain text password with the hashed password stored in the database
    const isMatch = await user.matchPassword(password); // Uses the custom method defined in User.js
    if (!isMatch) {
      // If passwords do not match, send an error response (invalid credentials)
      console.log('Login attempt: Password mismatch for user:', user.email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Log JWT_SECRET again before token generation (ensures it's still available)
    console.log('JWT_SECRET (Login context - after checks) (first 10 chars):', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'Not Set');

    // 3. Generate a JWT token for the authenticated user
    const token = jwt.sign(
      { id: user._id, role: user.role }, // Payload: user's ID and role
      process.env.JWT_SECRET,            // Secret key loaded from .env
      { expiresIn: process.env.JWT_EXPIRE || '1h' } // Token expiration time
    );

    // For debugging, log the generated token (remove in production for security)
    console.log('JWT token generated successfully (first 10 chars):', token.substring(0,10) + '...');

    // 4. Respond with a success message, the generated token, and relevant user details
    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: { // Send back non-sensitive user information for the frontend
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
    console.log('--- Login Attempt Finished Successfully ---'); // Log success
  } catch (err) {
    // Handle any unexpected server errors during the login process
    console.error('Error during login: FULL ERROR OBJECT ->', err); // Log the full error object
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router; // Export the router

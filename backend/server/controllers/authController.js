// backend/server/controllers/authController.js

const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  console.log('--- Registration Attempt Received ---');
  console.log('Register: Input email:', email);
  console.log('Register: Received password (first 5 chars):', password ? password.substring(0, 5) + '...' : 'undefined/null');

  let hashedPassword;
  try {
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);
    console.log('Register: Hashed password (first 10 chars):', hashedPassword ? hashedPassword.substring(0, 10) + '...' : 'undefined/null');
  } catch (error) {
    console.error('Register: Error hashing password:', error);
    return next(new ErrorResponse('Failed to hash password during registration.', 500));
  }

  // --- NEW DEBUGGING HERE ---
  console.log('Register: Attempting to create user with data:');
  console.log({ username, email, password: hashedPassword ? hashedPassword.substring(0, 10) + '...' : 'undefined/null', role });

  let user;
  try {
    user = await User.create({
      username,
      email,
      password: hashedPassword, // Use the directly hashed password
      role,
    });
    console.log('Register: User created successfully in DB. User ID:', user._id);

    // After creation, fetch the user again specifically selecting the password to confirm it was saved
    const createdUserWithPassword = await User.findById(user._id).select('+password');
    console.log('Register: User fetched after creation. Password in DB (first 10 chars):',
      createdUserWithPassword && createdUserWithPassword.password ? createdUserWithPassword.password.substring(0, 10) + '...' : 'undefined/null');

  } catch (error) {
    console.error('Register: Error creating user in database:', error);
    // Mongoose duplicate key error (e.g., trying to register with an existing email/username)
    if (error.code === 11000) {
      const message = `Duplicate field value entered: ${Object.keys(error.keyValue)[0]} already exists.`;
      return next(new ErrorResponse(message, 400));
    }
    return next(new ErrorResponse('Failed to create user in database.', 500));
  }
  // --- END NEW DEBUGGING ---

  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  console.log('--- Login Attempt Received ---');
  console.log('Attempting login for email:', email);

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    console.log('Login attempt: User not found for email:', email);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  console.log('Login attempt: User found. User email:', user.email);
  console.log('Login attempt: User password hash (first 10 chars):', user.password ? user.password.substring(0, 10) + '...' : 'undefined/null');
  console.log('Login attempt: Provided password (first 5 chars):', password ? password.substring(0, 5) + '...' : 'undefined/null');

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res);
});

// ... (rest of the controller functions: getMe, logout, forgotPassword, resetPassword, updateDetails, updatePassword)
// Ensure these are all present and correct as per previous updates.
// No changes needed for these functions in this step.
// For brevity, I'm omitting them here, but ensure they are in your file.

exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      walletBalance: user.walletBalance
    }
  });
});

exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  res.status(200).json({ success: true, data: {} });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetUrl = `${req.protocol}://${req.get('host')}/resetpassword/${resetToken}`;
  console.log(`Password reset URL: ${resetUrl}`);
  res.status(200).json({ success: true, data: 'Email sent (check console for URL)' });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });
  if (!user) {
    return next(new ErrorResponse('Invalid token or token has expired', 400));
  }
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  sendTokenResponse(user, 200, res);
});

exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    username: req.body.username,
    email: req.body.email
  };
  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });
  res.status(200).json({ success: true, data: user });
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }
  user.password = req.body.newPassword;
  await user.save();
  sendTokenResponse(user, 200, res);
});

    // server/models/User.js

    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');

    const UserSchema = new mongoose.Schema({
      username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
      },
      email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          'Please add a valid email',
        ],
      },
      password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false, // Do not return password in query results by default
      },
      role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
      },
      walletBalance: {
        type: Number,
        default: 0,
        min: 0,
      },
      resetPasswordToken: String,
      resetPasswordExpire: Date,
      walletTransactions: {
        type: [String],
        default: [],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    });

    // Middleware to hash password before saving the user
    // This hook will now primarily handle password updates (e.g., resetPassword, updatePassword)
    // For initial registration, the password is hashed directly in authController.register
    UserSchema.pre('save', async function (next) {
      console.log('UserSchema.pre("save") hook triggered.');
      if (!this.isModified('password')) {
        console.log('Pre-save: Password not modified, skipping hashing.');
        return next();
      }

      // Check if the password looks like it's already hashed (starts with bcrypt prefix)
      // This prevents double hashing if the controller already hashed it
      if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
          console.log('Pre-save: Password appears to be already hashed, skipping pre-save hashing.');
          return next();
      }

      console.log('Pre-save: Password before hashing (first 5 chars):', this.password ? this.password.substring(0, 5) + '...' : 'undefined/null');

      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Pre-save: Password after hashing (first 10 chars):', this.password ? this.password.substring(0, 10) + '...' : 'undefined/null');
        next();
      } catch (error) {
        console.error('Pre-save: Error during password hashing:', error);
        next(error);
      }
    });

    // Method to compare entered password with hashed password in the database
    UserSchema.methods.matchPassword = async function (enteredPassword) {
      console.log('matchPassword method: Entered password (first 5 chars):', enteredPassword ? enteredPassword.substring(0, 5) + '...' : 'undefined/null');
      console.log('matchPassword method: Stored hash (first 10 chars):', this.password ? this.password.substring(0, 10) + '...' : 'undefined/null');

      if (typeof this.password !== 'string' || !this.password) {
          console.error('matchPassword method: Stored password is not a valid string for comparison.');
          return false;
      }
      return await bcrypt.compare(enteredPassword, this.password);
    };

    // Method to generate and return JWT token
    UserSchema.methods.getSignedJwtToken = function () {
      return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
      });
    };

    // Method to generate and hash password reset token
    UserSchema.methods.getResetPasswordToken = function () {
      const resetToken = crypto.randomBytes(20).toString('hex');
      this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      return resetToken;
    };

    module.exports = mongoose.model('User', UserSchema);
    
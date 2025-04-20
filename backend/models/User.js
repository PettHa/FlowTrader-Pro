// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config'); // Changed path

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vennligst oppgi navn'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Vennligst oppgi e-post'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Vennligst oppgi en gyldig e-postadresse'
    ]
  },
  password: {
    type: String,
    required: [true, 'Vennligst oppgi passord'],
    minlength: 8,
    select: false // Important: don't send password by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
    // Optional: Add timestamps if you want Mongoose to handle createdAt/updatedAt automatically
    // timestamps: true
});

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass error to the next middleware
  }
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  // Use the correct secret and expiry from the merged config
  return jwt.sign({ id: this._id, role: this.role }, config.jwtSecret, {
    expiresIn: config.jwtExpire
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  // Needs the hashed password, ensure it's selected if needed elsewhere, or handle select: false here
  // const userWithPassword = await this.constructor.findById(this._id).select('+password');
  // return await bcrypt.compare(enteredPassword, userWithPassword.password);
   // Or, if password field is available directly (less secure if fetched without select('+password'))
   return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
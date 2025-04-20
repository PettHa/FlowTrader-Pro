// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

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
    select: false
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
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, config.jwtSecret, {
    expiresIn: config.jwtExpire
  });
};

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

// backend/models/Strategy.js
const mongoose = require('mongoose');

const StrategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vennligst oppgi et navn for strategien'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  flowData: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  markets: [{
    exchange: String,
    symbol: String,
    timeframe: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Strategy', StrategySchema);

// backend/models/Exchange.js
const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config');

const ExchangeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vennligst oppgi et navn for børstilkoblingen'],
    trim: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    required: [true, 'Vennligst velg børs'],
    enum: ['binance', 'coinbase', 'ftx', 'tradingview', 'alpaca']
  },
  credentials: {
    apiKey: {
      type: String,
      required: [true, 'API-nøkkel er påkrevd'],
      select: false
    },
    secretKey: {
      type: String,
      required: [true, 'Secret key er påkrevd'],
      select: false
    },
    passphrase: {
      type: String,
      select: false
    },
    subaccount: String,
    webhookUrl: String,
    alertToken: String,
    isPaper: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTested: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt sensitive data before saving
ExchangeSchema.pre('save', function(next) {
  // Only encrypt if the keys are modified
  if (!this.isModified('credentials.apiKey') && !this.isModified('credentials.secretKey')) {
    return next();
  }
  
  // Encrypt API key
  if (this.credentials.apiKey) {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(config.encryptionKey, 'hex'),
      Buffer.from(config.encryptionIv, 'hex')
    );
    let encryptedApiKey = cipher.update(this.credentials.apiKey, 'utf8', 'hex');
    encryptedApiKey += cipher.final('hex');
    this.credentials.apiKey = encryptedApiKey;
  }
  
  // Encrypt Secret key
  if (this.credentials.secretKey) {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(config.encryptionKey, 'hex'),
      Buffer.from(config.encryptionIv, 'hex')
    );
    let encryptedSecretKey = cipher.update(this.credentials.secretKey, 'utf8', 'hex');
    encryptedSecretKey += cipher.final('hex');
    this.credentials.secretKey = encryptedSecretKey;
  }
  
  // Encrypt passphrase if present
  if (this.credentials.passphrase) {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(config.encryptionKey, 'hex'),
      Buffer.from(config.encryptionIv, 'hex')
    );
    let encryptedPassphrase = cipher.update(this.credentials.passphrase, 'utf8', 'hex');
    encryptedPassphrase += cipher.final('hex');
    this.credentials.passphrase = encryptedPassphrase;
  }
  
  next();
});

// Method to decrypt API keys when needed
ExchangeSchema.methods.getDecryptedCredentials = function() {
  const credentials = {};
  
  // Decrypt API key
  if (this.credentials.apiKey) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(config.encryptionKey, 'hex'),
      Buffer.from(config.encryptionIv, 'hex')
    );
    let decryptedApiKey = decipher.update(this.credentials.apiKey, 'hex', 'utf8');
    decryptedApiKey += decipher.final('utf8');
    credentials.apiKey = decryptedApiKey;
  }
  
  // Decrypt Secret key
  if (this.credentials.secretKey) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(config.encryptionKey, 'hex'),
      Buffer.from(config.encryptionIv, 'hex')
    );
    let decryptedSecretKey = decipher.update(this.credentials.secretKey, 'hex', 'utf8');
    decryptedSecretKey += decipher.final('utf8');
    credentials.secretKey = decryptedSecretKey;
  }
  
  // Decrypt passphrase if present
  if (this.credentials.passphrase) {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(config.encryptionKey, 'hex'),
      Buffer.from(config.encryptionIv, 'hex')
    );
    let decryptedPassphrase = decipher.update(this.credentials.passphrase, 'hex', 'utf8');
    decryptedPassphrase += decipher.final('utf8');
    credentials.passphrase = decryptedPassphrase;
  }
  
  // Copy non-sensitive fields
  credentials.subaccount = this.credentials.subaccount;
  credentials.webhookUrl = this.credentials.webhookUrl;
  credentials.alertToken = this.credentials.alertToken;
  credentials.isPaper = this.credentials.isPaper;
  
  return credentials;
};

module.exports = mongoose.model('Exchange', ExchangeSchema);

// backend/models/BacktestResult.js
const mongoose = require('mongoose');

const BacktestResultSchema = new mongoose.Schema({
  strategy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Strategy',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  market: {
    exchange: String,
    symbol: String,
    timeframe: String
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  parameters: {
    type: Object,
    default: {}
  },
  summary: {
    totalTrades: Number,
    winRate: Number,
    profitFactor: Number,
    sharpeRatio: Number,
    maxDrawdown: Number,
    annualReturn: Number,
    finalEquity: Number
  },
  trades: [{
    timestamp: Date,
    entryPrice: Number,
    exitPrice: Number,
    positionType: {
      type: String,
      enum: ['LONG', 'SHORT']
    },
    profit: Number,
    profitPercent: Number
  }],
  equityCurve: [{
    timestamp: Date,
    equity: Number
  }],
  monthlyReturns: [{
    year: Number,
    month: Number,
    return: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BacktestResult', BacktestResultSchema);

// backend/models/Trade.js
const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  strategy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Strategy',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: mongoose.Schema.ObjectId,
    ref: 'Exchange',
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  orderId: {
    type: String
  },
  orderType: {
    type: String,
    enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT']
  },
  positionType: {
    type: String,
    enum: ['LONG', 'SHORT']
  },
  action: {
    type: String,
    enum: ['ENTRY', 'EXIT', 'ADD', 'REDUCE']
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number
  },
  status: {
    type: String,
    enum: ['PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'],
    default: 'PENDING'
  },
  entryTime: {
    type: Date
  },
  exitTime: {
    type: Date
  },
  profit: Number,
  profitPercent: Number,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trade', TradeSchema);
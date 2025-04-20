// backend/models/Exchange.js
const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config'); // Changed path

const ExchangeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vennligst oppgi et navn for børstilkoblingen'],
    trim: true,
    unique: true // Ensure names are unique per user? Consider compound index if needed.
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    required: [true, 'Vennligst velg børs'],
    // Add more exchanges as needed
    enum: ['binance', 'coinbase', 'ftx', 'tradingview', 'alpaca', 'kraken', 'bybit', 'other']
  },
  credentials: {
    apiKey: {
      type: String,
      required: [true, 'API-nøkkel er påkrevd'],
      // select: false // Don't select by default - encryption provides security at rest
    },
    secretKey: {
      type: String,
      required: [true, 'Secret key er påkrevd'],
      // select: false
    },
    passphrase: { // Required for some exchanges like Coinbase Pro
      type: String,
      // select: false
    },
    subaccount: String, // Optional subaccount name (e.g., for FTX)
    // Specific fields for different connection types
    webhookUrl: String, // For TradingView alerts
    alertToken: String, // Secure token for validating TradingView alerts
    isPaper: { // Is this a paper trading / testnet account?
      type: Boolean,
      default: false
    }
  },
  isActive: { // Is this connection enabled for use?
    type: Boolean,
    default: true
  },
  lastTested: { // Timestamp of the last successful connection test
    type: Date
  },
  connectionStatus: { // Store the result of the last test
      type: String,
      enum: [' untested', 'ok', 'failed', 'pending'],
      default: 'untested'
  },
  errorMessage: String // Store error message if connection failed
}, {
    timestamps: true // Automatically add createdAt and updatedAt
});

// --- Encryption Hooks ---
const algorithm = 'aes-256-cbc';

// Function to encrypt text
function encrypt(text) {
    if (!config.encryptionKey || !config.encryptionIv) {
        console.error('FATAL: ENCRYPTION_KEY or ENCRYPTION_IV not set. Cannot encrypt.');
        // Depending on requirements, you might throw an error or handle differently
        // throw new Error('Encryption keys not configured.');
        return text; // Return plaintext if keys are missing (insecure!)
    }
     if (!text) return text; // Handle null/empty strings
    try {
        const key = Buffer.from(config.encryptionKey, 'hex');
        const iv = Buffer.from(config.encryptionIv, 'hex');
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted; // Prepend IV for decryption
    } catch (error) {
        console.error('Encryption failed:', error);
        return text; // Fallback to plaintext on error (consider logging/alerting)
    }
}

// Function to decrypt text
function decrypt(text) {
     if (!config.encryptionKey || !config.encryptionIv) {
        console.error('FATAL: ENCRYPTION_KEY or ENCRYPTION_IV not set. Cannot decrypt.');
        return text; // Return encrypted text if keys are missing
    }
    if (!text || typeof text !== 'string' || !text.includes(':')) return text; // Check format

    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift(), 'hex'); // Use the stored IV
        const encryptedText = parts.join(':');
        const key = Buffer.from(config.encryptionKey, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        return text; // Return original text on error
    }
}

// Encrypt sensitive fields before saving
ExchangeSchema.pre('save', function(next) {
  // Only encrypt if modified
  if (this.isModified('credentials.apiKey')) {
    this.credentials.apiKey = encrypt(this.credentials.apiKey);
  }
  if (this.isModified('credentials.secretKey')) {
    this.credentials.secretKey = encrypt(this.credentials.secretKey);
  }
  if (this.isModified('credentials.passphrase')) {
    this.credentials.passphrase = encrypt(this.credentials.passphrase);
  }
  if (this.isModified('credentials.alertToken')) {
      this.credentials.alertToken = encrypt(this.credentials.alertToken);
  }
  next();
});

// Method to get decrypted credentials - USE WITH CAUTION
// Only call this when you actually need the plain text keys to connect to the exchange API
ExchangeSchema.methods.getDecryptedCredentials = function() {
  const credentials = { ...this.credentials }; // Clone the object

  if (credentials.apiKey) credentials.apiKey = decrypt(credentials.apiKey);
  if (credentials.secretKey) credentials.secretKey = decrypt(credentials.secretKey);
  if (credentials.passphrase) credentials.passphrase = decrypt(credentials.passphrase);
  if (credentials.alertToken) credentials.alertToken = decrypt(credentials.alertToken);

  // Remove encrypted fields before returning? Optional.
  // return { ...credentials }; // Return the full object with decrypted values

  // Return only the needed fields for connection usually:
   return {
       apiKey: credentials.apiKey,
       secretKey: credentials.secretKey,
       passphrase: credentials.passphrase,
       subaccount: credentials.subaccount,
       isPaper: credentials.isPaper,
       webhookUrl: credentials.webhookUrl,
       alertToken: credentials.alertToken
   };
};

// Compound index for user and exchange name to ensure uniqueness per user
ExchangeSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Exchange', ExchangeSchema);
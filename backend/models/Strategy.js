// backend/models/Strategy.js
const mongoose = require('mongoose');

const StrategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vennligst oppgi et navn for strategien'],
    trim: true,
    maxlength: [100, 'Navnet kan ikke være lengre enn 100 tegn']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Beskrivelsen kan ikke være lengre enn 500 tegn']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // Represents the data from the frontend visual builder (React Flow)
  flowData: {
    type: Object, // Store nodes and edges
    required: [true, 'Strategiflyt (flowData) er påkrevd']
  },
  isActive: { // Is the strategy currently running live?
    type: Boolean,
    default: false
  },
  // Which markets is this strategy configured for? (Optional)
  markets: [{
    exchange: String, // e.g., 'binance'
    symbol: String,   // e.g., 'BTC/USDT'
    timeframe: String // e.g., '1h'
  }],
  // Add parameters used by the strategy (maybe extracted from flowData or separate)
  parameters: {
      type: Object,
      default: {}
  }
}, {
    timestamps: true // Automatically add createdAt and updatedAt
});

// Optional: Index for faster lookups by user
StrategySchema.index({ user: 1 });

module.exports = mongoose.model('Strategy', StrategySchema);
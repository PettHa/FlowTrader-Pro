// backend/models/Trade.js
const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  strategy: { // Which strategy initiated this trade?
    type: mongoose.Schema.ObjectId,
    ref: 'Strategy',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  exchange: { // Which exchange connection was used?
    type: mongoose.Schema.ObjectId,
    ref: 'Exchange',
    required: true,
    index: true
  },
  symbol: { // e.g., 'BTC/USDT'
    type: String,
    required: true,
    index: true
  },
  // Exchange specific identifiers
  orderId: { // ID from the exchange for the entry order
    type: String,
    index: true
  },
  exitOrderId: { // ID from the exchange for the exit order (if applicable)
    type: String,
    index: true
  },
  clientOrderId: String, // Custom order ID sent to the exchange (if used)

  // Order details
  orderType: { // MARKET, LIMIT, STOP_LIMIT, etc.
    type: String,
    enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TAKE_PROFIT_MARKET', 'STOP_MARKET'],
    required: true
  },
  positionType: { // Side of the position
    type: String,
    enum: ['LONG', 'SHORT'],
    required: true
  },
  action: { // What triggered this trade record? Entry, Exit, Update?
    type: String,
    enum: ['ENTRY', 'EXIT', 'ADD', 'REDUCE', 'LIQUIDATION', 'MANUAL_CLOSE'],
    required: true
  },
  quantity: { // Amount traded
    type: Number,
    required: true
  },
  entryPrice: { // Average price for entry/addition
    type: Number
  },
  exitPrice: { // Average price for exit/reduction
    type: Number
  },
  // Status of the trade/position
  status: {
    type: String,
    // OPEN: Position is active
    // CLOSED: Position is fully closed
    // PENDING_ENTRY: Entry order placed but not filled
    // PENDING_EXIT: Exit order placed but not filled
    // FAILED: Order rejected or failed
    // CANCELLED: Order cancelled before fill
    enum: ['OPEN', 'CLOSED', 'PENDING_ENTRY', 'PENDING_EXIT', 'FAILED', 'CANCELLED', 'LIQUIDATED'],
    default: 'PENDING_ENTRY',
    index: true
  },
  // Timestamps
  entryTime: { // When the position was entered (first fill)
    type: Date,
    index: true
  },
  exitTime: { // When the position was fully closed
    type: Date,
    index: true
  },
  // Performance
  profit: Number, // Realized profit/loss in quote currency
  profitPercent: Number, // Realized profit/loss percentage
  commission: Number, // Trading fees paid
  commissionAsset: String, // Currency of the commission

  // Additional info
  notes: String, // User notes or system logs
  signalDetails: Object // Details about the signal that triggered the trade
}, {
  timestamps: true // Automatically add createdAt and updatedAt
});

// Index for faster lookup by status and time
TradeSchema.index({ status: 1, createdAt: -1 });
TradeSchema.index({ user: 1, strategy: 1, symbol: 1 });


module.exports = mongoose.model('Trade', TradeSchema);
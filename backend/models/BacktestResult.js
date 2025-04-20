// backend/models/BacktestResult.js
const mongoose = require('mongoose');

const BacktestResultSchema = new mongoose.Schema({
  strategy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Strategy',
    required: true,
    index: true // Index for faster lookup of results per strategy
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for faster lookup of results per user
  },
  market: {
    exchange: { type: String, required: true },
    symbol: { type: String, required: true },
    timeframe: { type: String, required: true }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // Parameters used for this specific backtest run
  parameters: {
    type: Object,
    default: {}
  },
  // Summary metrics
  summary: {
    initialEquity: { type: Number, default: 10000 }, // Add initial equity
    finalEquity: Number,
    totalReturnPercent: Number, // Calculated: (finalEquity / initialEquity - 1) * 100
    annualReturn: Number, // Annualized return percentage
    totalTrades: Number,
    winningTrades: Number, // Add count of winning trades
    losingTrades: Number, // Add count of losing trades
    winRate: Number, // winningTrades / totalTrades
    profitFactor: Number, // Gross Profit / Gross Loss
    sharpeRatio: Number, // Risk-adjusted return (needs risk-free rate)
    sortinoRatio: Number, // Downside deviation risk-adjusted return
    maxDrawdown: Number, // Maximum peak-to-trough decline percentage
    maxDrawdownDuration: Number, // Duration of max drawdown in days/bars
    averageTradeDuration: Number, // Average holding time
    averageWinPercent: Number, // Average gain of winning trades
    averageLossPercent: Number, // Average loss of losing trades
    expectancy: Number // (WinRate * AvgWin) - (LossRate * AvgLoss)
    // Add any other relevant metrics
  },
  // Detailed list of trades executed during the backtest
  trades: [{
    entryTimestamp: { type: Date, required: true },
    exitTimestamp: { type: Date, required: true },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number, required: true },
    positionType: { // 'LONG' or 'SHORT'
      type: String,
      enum: ['LONG', 'SHORT'],
      required: true
    },
    quantity: { type: Number, required: true }, // Size of the trade
    profit: Number, // Absolute profit/loss
    profitPercent: Number, // Percentage profit/loss
    duration: Number // Duration of the trade (e.g., in minutes or bars)
    // Optional: Add entry/exit signal names if available
  }],
  // Data points for plotting the equity curve over time
  equityCurve: [{
    timestamp: Date,
    equity: Number
  }],
  // Optional: Monthly/Yearly return breakdown
  monthlyReturns: [{
    year: Number,
    month: Number, // 0-11 for Jan-Dec
    return: Number // Percentage return for the month
  }]
}, {
  timestamps: true // Automatically add createdAt and updatedAt
});

// Index for faster sorting by creation date
BacktestResultSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BacktestResult', BacktestResultSchema);
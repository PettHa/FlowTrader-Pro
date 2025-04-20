// backend/models/MarketDataCache.js
const mongoose = require('mongoose');

const CACHE_TTL_SECONDS = parseInt(process.env.MARKET_DATA_CACHE_TTL_SECONDS || '604800'); // 7 dager default

const MarketDataCacheSchema = new mongoose.Schema({
  exchange: { type: String, required: true, index: true },
  symbol: { type: String, required: true, index: true }, // Format: BASE/QUOTE e.g., BTC/USDT
  timeframe: { type: String, required: true, index: true }, // e.g., '1h', '1d'
  timestamp: { type: Date, required: true, index: true }, // Start time of the candle
  open: { type: Number, required: true },
  high: { type: Number, required: true },
  low: { type: Number, required: true },
  close: { type: Number, required: true },
  volume: { type: Number, required: true },
  // createdAt added automatically by TTL index, but useful for querying
  // If not using TTL index, add manually with timestamps: true
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL index: Automatically removes documents after specified seconds
    expires: CACHE_TTL_SECONDS,
    index: true // Index for potential querying by age
  }
});

// Compound index for the primary lookup query
MarketDataCacheSchema.index({ exchange: 1, symbol: 1, timeframe: 1, timestamp: 1 }, { unique: true });

// Optional: Explicitly add timestamps if needed elsewhere, though createdAt is handled by TTL
// MarketDataCacheSchema.set('timestamps', true);

module.exports = mongoose.model('MarketDataCache', MarketDataCacheSchema);
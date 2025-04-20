// backend/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const exchangeRoutes = require('./routes/exchangeRoutes');
const tradingRoutes = require('./routes/tradingRoutes');
const marketDataRoutes = require('./routes/marketDataRoutes');

// Initialize app
const app = express();

// Connect to database
db.connect();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());
app.use(morgan('dev')); // Logging

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/exchanges', exchangeRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/market-data', marketDataRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Error handling
app.use(errorHandler);

module.exports = app;
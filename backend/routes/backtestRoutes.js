// backend/routes/backtestRoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const {
  runBacktest,
  getBacktestResults,
  getBacktestResult,
  deleteBacktestResult,
  compareBacktestResults,
  optimizeStrategy
} = require('../controllers/backtestController'); // Import the actual controller

// Import authentication middleware
const { protect } = require('../middleware/auth'); // Assuming auth middleware exists

// --- Backtest Routes ---

// Run a new backtest for a strategy
router.post('/run/:strategyId', protect, runBacktest);

// Get all backtest results for a specific strategy
router.get('/results/:strategyId', protect, getBacktestResults);

// Get details of a single backtest result
router.get('/result/:id', protect, getBacktestResult);

// Delete a specific backtest result
router.delete('/result/:id', protect, deleteBacktestResult);

// Compare multiple backtest results (e.g., for performance analysis)
router.post('/compare', protect, compareBacktestResults);

// Run optimization for a strategy
router.post('/optimize/:strategyId', protect, optimizeStrategy);

// Optional: Route to check optimization job status
// router.get('/optimize/status/:jobId', protect, getOptimizationStatus);

module.exports = router;
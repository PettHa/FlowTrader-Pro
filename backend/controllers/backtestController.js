// backend/controllers/backtestController.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Strategy = require('../models/Strategy');
const BacktestResult = require('../models/BacktestResult');
const BacktestService = require('../services/backtestService');
const MarketDataService = require('../services/marketDataService');

/**
 * @desc    Run backtest for a strategy
 * @route   POST /api/backtest/run/:strategyId
 * @access  Private
 */
exports.runBacktest = asyncHandler(async (req, res, next) => {
  // Validate parameters
  const { exchange, symbol, timeframe, startDate, endDate, parameters } = req.body;
  
  if (!exchange || !symbol || !timeframe || !startDate || !endDate) {
    return next(new ErrorResponse('Mangler påkrevde parametre for backtesting', 400));
  }
  
  // Check if strategy exists and belongs to the user
  const strategy = await Strategy.findOne({
    _id: req.params.strategyId,
    user: req.user.id
  });
  
  if (!strategy) {
    return next(new ErrorResponse('Strategien ble ikke funnet eller tilhører ikke denne brukeren', 404));
  }
  
  // Fetch market data
  const marketData = await MarketDataService.getHistoricalData(
    exchange,
    symbol,
    timeframe,
    new Date(startDate),
    new Date(endDate)
  );
  
  if (!marketData || marketData.length === 0) {
    return next(new ErrorResponse('Kunne ikke hente markedsdata for den angitte perioden', 404));
  }
  
  // Execute backtest
  try {
    const backtestEngine = new BacktestService(strategy.flowData, marketData, parameters);
    const backtestResults = await backtestEngine.run();
    
    // Save backtest results
    const newBacktestResult = await BacktestResult.create({
      strategy: strategy._id,
      user: req.user.id,
      market: {
        exchange,
        symbol,
        timeframe
      },
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      parameters: parameters || {},
      summary: {
        totalTrades: backtestResults.summary.totalTrades,
        winRate: backtestResults.summary.winRate,
        profitFactor: backtestResults.summary.profitFactor,
        sharpeRatio: backtestResults.summary.sharpeRatio,
        maxDrawdown: backtestResults.summary.maxDrawdown,
        annualReturn: backtestResults.summary.annualReturn,
        finalEquity: backtestResults.summary.finalEquity
      },
      trades: backtestResults.trades,
      equityCurve: backtestResults.equityCurve,
      monthlyReturns: backtestResults.monthlyReturns
    });
    
    res.status(201).json({
      success: true,
      data: newBacktestResult
    });
  } catch (error) {
    return next(new ErrorResponse(`Feil under backtesting: ${error.message}`, 500));
  }
});

/**
 * @desc    Get all backtest results for a strategy
 * @route   GET /api/backtest/results/:strategyId
 * @access  Private
 */
exports.getBacktestResults = asyncHandler(async (req, res, next) => {
  // Check if strategy exists and belongs to the user
  const strategy = await Strategy.findOne({
    _id: req.params.strategyId,
    user: req.user.id
  });
  
  if (!strategy) {
    return next(new ErrorResponse('Strategien ble ikke funnet eller tilhører ikke denne brukeren', 404));
  }
  
  const backtestResults = await BacktestResult.find({
    strategy: req.params.strategyId,
    user: req.user.id
  }).sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: backtestResults.length,
    data: backtestResults
  });
});

/**
 * @desc    Get a single backtest result
 * @route   GET /api/backtest/result/:id
 * @access  Private
 */
exports.getBacktestResult = asyncHandler(async (req, res, next) => {
  const backtestResult = await BacktestResult.findOne({
    _id: req.params.id,
    user: req.user.id
  });
  
  if (!backtestResult) {
    return next(new ErrorResponse('Backtestresultatet ble ikke funnet eller tilhører ikke denne brukeren', 404));
  }
  
  res.status(200).json({
    success: true,
    data: backtestResult
  });
});

/**
 * @desc    Delete a backtest result
 * @route   DELETE /api/backtest/result/:id
 * @access  Private
 */
exports.deleteBacktestResult = asyncHandler(async (req, res, next) => {
  const backtestResult = await BacktestResult.findOne({
    _id: req.params.id,
    user: req.user.id
  });
  
  if (!backtestResult) {
    return next(new ErrorResponse('Backtestresultatet ble ikke funnet eller tilhører ikke denne brukeren', 404));
  }
  
  await backtestResult.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Compare multiple backtest results
 * @route   POST /api/backtest/compare
 * @access  Private
 */
exports.compareBacktestResults = asyncHandler(async (req, res, next) => {
  const { resultIds } = req.body;
  
  if (!resultIds || !Array.isArray(resultIds) || resultIds.length < 2) {
    return next(new ErrorResponse('Minst to backtestresultat-IDer må oppgis for sammenligning', 400));
  }
  
  // Fetch all requested backtest results
  const backtestResults = await BacktestResult.find({
    _id: { $in: resultIds },
    user: req.user.id
  });
  
  if (backtestResults.length !== resultIds.length) {
    return next(new ErrorResponse('Ett eller flere backtestresultater ble ikke funnet', 404));
  }
  
  // Prepare comparison data
  const comparisonData = backtestResults.map(result => ({
    id: result._id,
    strategyId: result.strategy,
    market: result.market,
    timeframe: result.timeframe,
    startDate: result.startDate,
    endDate: result.endDate,
    summary: result.summary,
    createdAt: result.createdAt
  }));
  
  res.status(200).json({
    success: true,
    data: comparisonData
  });
});

/**
 * @desc    Run optimization for a strategy
 * @route   POST /api/backtest/optimize/:strategyId
 * @access  Private
 */
exports.optimizeStrategy = asyncHandler(async (req, res, next) => {
  const { exchange, symbol, timeframe, startDate, endDate, parameters, optimizationTarget } = req.body;
  
  if (!exchange || !symbol || !timeframe || !startDate || !endDate || !parameters || !optimizationTarget) {
    return next(new ErrorResponse('Mangler påkrevde parametre for optimalisering', 400));
  }
  
  // Check if strategy exists and belongs to the user
  const strategy = await Strategy.findOne({
    _id: req.params.strategyId,
    user: req.user.id
  });
  
  if (!strategy) {
    return next(new ErrorResponse('Strategien ble ikke funnet eller tilhører ikke denne brukeren', 404));
  }
  
  // Fetch market data
  const marketData = await MarketDataService.getHistoricalData(
    exchange,
    symbol,
    timeframe,
    new Date(startDate),
    new Date(endDate)
  );
  
  if (!marketData || marketData.length === 0) {
    return next(new ErrorResponse('Kunne ikke hente markedsdata for den angitte perioden', 404));
  }
  
  try {
    // Start optimization in the background (potentially a longer process)
    // In a real implementation, this might use a job queue system like Bull
    const optimizationJob = await BacktestService.startOptimization(
      strategy.flowData,
      marketData,
      parameters,
      optimizationTarget,
      req.user.id,
      strategy._id
    );
    
    res.status(202).json({
      success: true,
      message: 'Optimalisering startet',
      jobId: optimizationJob.id
    });
  } catch (error) {
    return next(new ErrorResponse(`Feil under oppstart av optimalisering: ${error.message}`, 500));
  }
});
// backend/services/backtestService.js
const StrategyCompiler = require('./strategyCompiler');
const BacktestResult = require('../models/BacktestResult');
const OptimizationJob = require('../models/OptimizationJob');

class BacktestService {
  /**
   * Constructor for the BacktestService
   * @param {Object} flowData - The flow data from the strategy builder
   * @param {Array} marketData - Historical market data
   * @param {Object} parameters - Optional parameters to override strategy defaults
   */
  constructor(flowData, marketData, parameters = {}) {
    this.flowData = flowData;
    this.marketData = marketData;
    this.parameters = parameters;
    
    // Compile the strategy to executable code
    this.compiledStrategy = StrategyCompiler.compileStrategy(flowData, parameters);
  }

  /**
   * Run the backtest
   * @returns {Object} - Backtest results
   */
  async run() {
    // Initialize results structure
    const results = {
      summary: {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        annualReturn: 0,
        finalEquity: 0
      },
      trades: [],
      equityCurve: [],
      monthlyReturns: []
    };
    
    // Initialize backtest variables
    let equity = 10000; // Starting equity
    const equityCurve = [{ timestamp: this.marketData[0].timestamp, equity }];
    let position = null;
    const trades = [];
    let totalProfit = 0;
    let totalLoss = 0;
    let winCount = 0;
    let lossCount = 0;
    
    // Prepare monthly returns tracking
    const monthlyReturns = {};
    
    // Track max drawdown
    let highestEquity = equity;
    let maxDrawdown = 0;
    
    // Process each market data point
    for (let i = 50; i < this.marketData.length; i++) { // Skip the first 50 bars for indicator warmup
      const currentBar = this.marketData[i];
      const prevBar = this.marketData[i - 1];
      
      // Prepare data for the strategy
      const dataForStrategy = this._prepareDataForStrategy(i);
      
      // Execute strategy for this bar
      const signal = this.compiledStrategy.execute(dataForStrategy, position);
      
      // Process signals
      if (signal) {
        // Handle entry signals
        if (signal.action === 'ENTRY' && !position) {
          position = {
            type: signal.positionType,
            entryPrice: currentBar.close,
            entryTime: currentBar.timestamp,
            size: 1 // Simplified, would use proper position sizing in real implementation
          };
        }
        // Handle exit signals
        else if (signal.action === 'EXIT' && position && position.type === signal.positionType) {
          // Calculate trade result
          const exitPrice = currentBar.close;
          const entryPrice = position.entryPrice;
          
          let profit = 0;
          let profitPercent = 0;
          
          if (position.type === 'LONG') {
            profit = (exitPrice - entryPrice) * position.size;
            profitPercent = ((exitPrice / entryPrice) - 1) * 100;
          } else { // SHORT
            profit = (entryPrice - exitPrice) * position.size;
            profitPercent = ((entryPrice / exitPrice) - 1) * 100;
          }
          
          // Update equity
          equity += profit;
          
          // Track highest equity for drawdown calculation
          if (equity > highestEquity) {
            highestEquity = equity;
          } else {
            const currentDrawdown = (highestEquity - equity) / highestEquity * 100;
            if (currentDrawdown > maxDrawdown) {
              maxDrawdown = currentDrawdown;
            }
          }
          
          // Record trade
          const trade = {
            timestamp: currentBar.timestamp,
            entryPrice,
            exitPrice,
            positionType: position.type,
            profit,
            profitPercent
          };
          
          trades.push(trade);
          
          // Update statistics
          if (profit > 0) {
            winCount++;
            totalProfit += profit;
          } else {
            lossCount++;
            totalLoss += Math.abs(profit);
          }
          
          // Track monthly returns
          const year = currentBar.timestamp.getFullYear();
          const month = currentBar.timestamp.getMonth();
          const monthKey = `${year}-${month}`;
          
          if (!monthlyReturns[monthKey]) {
            monthlyReturns[monthKey] = {
              year,
              month,
              return: 0
            };
          }
          
          monthlyReturns[monthKey].return += profitPercent;
          
          // Close position
          position = null;
        }
      }
      
      // Record equity curve
      equityCurve.push({
        timestamp: currentBar.timestamp,
        equity
      });
    }
    
    // Calculate summary statistics
    const totalTrades = winCount + lossCount;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    
    // Calculate Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].equity / equityCurve[i-1].equity) - 1;
      returns.push(dailyReturn);
    }
    
    const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDevReturn = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length
    );
    
    const sharpeRatio = stdDevReturn > 0 ? (averageReturn / stdDevReturn) * Math.sqrt(252) : 0; // Annualized
    
    // Calculate annualized return
    const startDate = new Date(this.marketData[50].timestamp); // Skip warmup
    const endDate = new Date(this.marketData[this.marketData.length - 1].timestamp);
    const yearFraction = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
    const finalEquity = equityCurve[equityCurve.length - 1].equity;
    const annualReturn = yearFraction > 0 ? 
      (Math.pow(finalEquity / 10000, 1/yearFraction) - 1) * 100 : 
      0;
    
    // Prepare results
    results.summary = {
      totalTrades,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      annualReturn,
      finalEquity
    };
    
    results.trades = trades;
    results.equityCurve = equityCurve;
    results.monthlyReturns = Object.values(monthlyReturns);
    
    return results;
  }
  
  /**
   * Prepare data for strategy execution at a specific index
   * @param {number} index - Current index in the market data array
   * @returns {Object} - Prepared data for strategy execution
   * @private
   */
  _prepareDataForStrategy(index) {
    // Create a lookback window for calculating indicators
    const lookback = Math.min(200, index);
    const dataWindow = this.marketData.slice(index - lookback, index + 1);
    
    // Calculate indicators required by the strategy
    return {
      current: this.marketData[index],
      previous: this.marketData[index - 1],
      dataWindow,
      indicators: this._calculateIndicators(dataWindow)
    };
  }
  
  /**
   * Calculate technical indicators based on the compiled strategy needs
   * @param {Array} dataWindow - Window of market data
   * @returns {Object} - Calculated indicators
   * @private
   */
  _calculateIndicators(dataWindow) {
    const indicators = {};
    
    // Extract indicator nodes from the flow data
    const indicatorNodes = this.flowData.nodes.filter(node => node.type === 'indicatorNode');
    
    // Calculate each required indicator
    for (const node of indicatorNodes) {
      const { id, data } = node;
      const indicatorType = data.indicatorType;
      
      switch (indicatorType) {
        case 'SMA':
          indicators[id] = this._calculateSMA(dataWindow, data.period || 20);
          break;
        case 'EMA':
          indicators[id] = this._calculateEMA(dataWindow, data.period || 20);
          break;
        case 'RSI':
          indicators[id] = this._calculateRSI(dataWindow, data.period || 14);
          break;
        case 'MACD':
          indicators[id] = this._calculateMACD(
            dataWindow, 
            data.fastPeriod || 12, 
            data.slowPeriod || 26, 
            data.signalPeriod || 9
          );
          break;
        case 'BBANDS':
          indicators[id] = this._calculateBollingerBands(
            dataWindow, 
            data.period || 20, 
            data.stdDev || 2
          );
          break;
        case 'STOCH':
          indicators[id] = this._calculateStochastic(
            dataWindow, 
            data.kPeriod || 14, 
            data.dPeriod || 3, 
            data.slowing || 3
          );
          break;
        default:
          console.warn(`Unknown indicator type: ${indicatorType}`);
      }
    }
    
    return indicators;
  }
  
  /**
   * Calculate Simple Moving Average
   * @param {Array} data - Market data
   * @param {number} period - Period for SMA
   * @returns {Object} - SMA values
   * @private
   */
  _calculateSMA(data, period) {
    const sma = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        sma.push(sum / period);
      }
    }
    
    return { value: sma[sma.length - 1], values: sma };
  }
  
  /**
   * Calculate Exponential Moving Average
   * @param {Array} data - Market data
   * @param {number} period - Period for EMA
   * @returns {Object} - EMA values
   * @private
   */
  _calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Initialize with SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }
    ema.push(sum / period);
    
    // Calculate EMA
    for (let i = 1; i < data.length - period + 1; i++) {
      const value = (data[i + period - 1].close - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(value);
    }
    
    // Pad beginning with nulls
    const padded = Array(period - 1).fill(null).concat(ema);
    
    return { value: padded[padded.length - 1], values: padded };
  }
  
  /**
   * Calculate Relative Strength Index
   * @param {Array} data - Market data
   * @param {number} period - Period for RSI
   * @returns {Object} - RSI values
   * @private
   */
  _calculateRSI(data, period) {
    const rsi = [];
    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate average gains and losses
    for (let i = 0; i < data.length - 1; i++) {
      if (i < period) {
        rsi.push(null);
      } else {
        let avgGain = 0;
        let avgLoss = 0;
        
        for (let j = 0; j < period; j++) {
          avgGain += gains[i - j];
          avgLoss += losses[i - j];
        }
        
        avgGain /= period;
        avgLoss /= period;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return { value: rsi[rsi.length - 1], values: rsi };
  }
  
  /**
   * Calculate MACD
   * @param {Array} data - Market data
   * @param {number} fastPeriod - Fast period
   * @param {number} slowPeriod - Slow period
   * @param {number} signalPeriod - Signal period
   * @returns {Object} - MACD values
   * @private
   */
  _calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
    // Calculate fast EMA
    const fastEMA = this._calculateEMA(data, fastPeriod).values;
    
    // Calculate slow EMA
    const slowEMA = this._calculateEMA(data, slowPeriod).values;
    
    // Calculate MACD line
    const macdLine = [];
    for (let i = 0; i < data.length; i++) {
      if (fastEMA[i] === null || slowEMA[i] === null) {
        macdLine.push(null);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }
    
    // Calculate signal line (EMA of MACD line)
    const signalLine = [];
    let signalSum = 0;
    let validMacdCount = 0;
    
    for (let i = 0; i < macdLine.length; i++) {
      if (macdLine[i] === null) {
        signalLine.push(null);
      } else {
        validMacdCount++;
        signalSum += macdLine[i];
        
        if (validMacdCount === signalPeriod) {
          signalLine.push(signalSum / signalPeriod);
        } else if (validMacdCount > signalPeriod) {
          const multiplier = 2 / (signalPeriod + 1);
          signalLine.push((macdLine[i] - signalLine[i - 1]) * multiplier + signalLine[i - 1]);
        } else {
          signalLine.push(null);
        }
      }
    }
    
    // Calculate histogram
    const histogram = [];
    for (let i = 0; i < data.length; i++) {
      if (macdLine[i] === null || signalLine[i] === null) {
        histogram.push(null);
      } else {
        histogram.push(macdLine[i] - signalLine[i]);
      }
    }
    
    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1],
      values: {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
      }
    };
  }
  
  /**
   * Calculate Bollinger Bands
   * @param {Array} data - Market data
   * @param {number} period - Period for Bollinger Bands
   * @param {number} stdDev - Standard deviation multiplier
   * @returns {Object} - Bollinger Bands values
   * @private
   */
  _calculateBollingerBands(data, period, stdDev) {
    const middle = [];
    const upper = [];
    const lower = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        middle.push(null);
        upper.push(null);
        lower.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        const sma = sum / period;
        middle.push(sma);
        
        let sumSquaredDiff = 0;
        for (let j = 0; j < period; j++) {
          sumSquaredDiff += Math.pow(data[i - j].close - sma, 2);
        }
        const standardDeviation = Math.sqrt(sumSquaredDiff / period);
        
        upper.push(sma + (standardDeviation * stdDev));
        lower.push(sma - (standardDeviation * stdDev));
      }
    }
    
    return {
      upper: upper[upper.length - 1],
      middle: middle[middle.length - 1],
      lower: lower[lower.length - 1],
      values: {
        upper,
        middle,
        lower
      }
    };
  }
  
  /**
   * Calculate Stochastic Oscillator
   * @param {Array} data - Market data
   * @param {number} kPeriod - %K period
   * @param {number} dPeriod - %D period
   * @param {number} slowing - Slowing period
   * @returns {Object} - Stochastic Oscillator values
   * @private
   */
  _calculateStochastic(data, kPeriod, dPeriod, slowing) {
    const k = [];
    const d = [];
    
    // Calculate %K
    for (let i = 0; i < data.length; i++) {
      if (i < kPeriod - 1) {
        k.push(null);
      } else {
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        
        for (let j = 0; j < kPeriod; j++) {
          highestHigh = Math.max(highestHigh, data[i - j].high);
          lowestLow = Math.min(lowestLow, data[i - j].low);
        }
        
        const currentK = 100 * ((data[i].close - lowestLow) / (highestHigh - lowestLow));
        k.push(currentK);
      }
    }
    
    // Apply slowing to %K
    const kSlowed = [];
    for (let i = 0; i < k.length; i++) {
      if (i < kPeriod - 1 + slowing - 1) {
        kSlowed.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < slowing; j++) {
          sum += k[i - j];
        }
        kSlowed.push(sum / slowing);
      }
    }
    
    // Calculate %D (SMA of %K slowed)
    for (let i = 0; i < kSlowed.length; i++) {
      if (i < kPeriod - 1 + slowing - 1 + dPeriod - 1) {
        d.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < dPeriod; j++) {
          sum += kSlowed[i - j];
        }
        d.push(sum / dPeriod);
      }
    }
    
    return {
      '%k': kSlowed[kSlowed.length - 1],
      '%d': d[d.length - 1],
      values: {
        k: kSlowed,
        d
      }
    };
  }
  
  /**
   * Start optimization process
   * @param {Object} flowData - Strategy flow data
   * @param {Array} marketData - Market data
   * @param {Object} parameters - Parameters to optimize
   * @param {string} optimizationTarget - Target metric to optimize
   * @param {string} userId - User ID
   * @param {string} strategyId - Strategy ID
   * @returns {Object} - Optimization job
   */
  static async startOptimization(flowData, marketData, parameters, optimizationTarget, userId, strategyId) {
    // Create an optimization job
    const optimizationJob = await OptimizationJob.create({
      user: userId,
      strategy: strategyId,
      parameters,
      optimizationTarget,
      status: 'RUNNING',
      progress: 0
    });
    
    // Start optimization in background
    setImmediate(async () => {
      try {
        await this._runOptimization(
          optimizationJob._id,
          flowData,
          marketData,
          parameters,
          optimizationTarget,
          userId,
          strategyId
        );
      } catch (error) {
        console.error('Optimization error:', error);
        
        // Update job with error
        await OptimizationJob.findByIdAndUpdate(optimizationJob._id, {
          status: 'FAILED',
          error: error.message
        });
      }
    });
    
    return optimizationJob;
  }
  
  /**
   * Run optimization process
   * @param {string} jobId - Optimization job ID
   * @param {Object} flowData - Strategy flow data
   * @param {Array} marketData - Market data
   * @param {Object} parameters - Parameters to optimize
   * @param {string} optimizationTarget - Target metric to optimize
   * @param {string} userId - User ID
   * @param {string} strategyId - Strategy ID
   * @private
   */
  static async _runOptimization(jobId, flowData, marketData, parameters, optimizationTarget, userId, strategyId) {
    // This is a simplified implementation
    // In a real system, this would use more advanced optimization algorithms
    
    // Define parameter ranges
    const paramRanges = {};
    Object.entries(parameters).forEach(([key, value]) => {
      if (typeof value === 'object' && value.min !== undefined && value.max !== undefined && value.step !== undefined) {
        paramRanges[key] = {
          min: value.min,
          max: value.max,
          step: value.step,
          values: []
        };
        
        // Generate values for this parameter
        for (let v = value.min; v <= value.max; v += value.step) {
          paramRanges[key].values.push(v);
        }
      }
    });
    
    // Generate parameter combinations
    const paramNames = Object.keys(paramRanges);
    const combinations = this._generateCombinations(paramRanges, paramNames);
    
    // Prepare results storage
    const results = [];
    
    // Run backtest for each combination
    for (let i = 0; i < combinations.length; i++) {
      const paramSet = combinations[i];
      
      // Create modified strategy with this parameter set
      const modifiedFlowData = JSON.parse(JSON.stringify(flowData));
      
      // Apply parameters to strategy nodes
      this._applyParametersToStrategy(modifiedFlowData, paramSet);
      
      // Run backtest
      const backtest = new BacktestService(modifiedFlowData, marketData);
      const backtestResults = await backtest.run();
      
      // Store results
      results.push({
        parameters: paramSet,
        results: backtestResults
      });
      
      // Update progress
      const progress = Math.round(((i + 1) / combinations.length) * 100);
      await OptimizationJob.findByIdAndUpdate(jobId, { progress });
    }
    
    // Find best result based on optimization target
    let bestResult = null;
    let bestValue = optimizationTarget === 'maxDrawdown' ? Infinity : -Infinity;
    
    for (const result of results) {
      const value = result.results.summary[optimizationTarget];
      
      if (optimizationTarget === 'maxDrawdown') {
        // For drawdown, lower is better
        if (value < bestValue) {
          bestValue = value;
          bestResult = result;
        }
      } else {
        // For other metrics, higher is better
        if (value > bestValue) {
          bestValue = value;
          bestResult = result;
        }
      }
    }
    
    // Save best result as a backtest result
    if (bestResult) {
      await BacktestResult.create({
        strategy: strategyId,
        user: userId,
        market: {
          exchange: marketData[0].exchange,
          symbol: marketData[0].symbol,
          timeframe: marketData[0].timeframe
        },
        startDate: marketData[0].timestamp,
        endDate: marketData[marketData.length - 1].timestamp,
        parameters: bestResult.parameters,
        summary: bestResult.results.summary,
        trades: bestResult.results.trades,
        equityCurve: bestResult.results.equityCurve,
        monthlyReturns: bestResult.results.monthlyReturns
      });
    }
    
    // Complete optimization job
    await OptimizationJob.findByIdAndUpdate(jobId, {
      status: 'COMPLETED',
      progress: 100,
      bestParameters: bestResult ? bestResult.parameters : null
    });
  }
  
  /**
   * Generate combinations of parameters
   * @param {Object} paramRanges - Parameter ranges
   * @param {Array} paramNames - Parameter names
   * @param {number} index - Current index
   * @param {Object} current - Current combination
   * @param {Array} result - Result array
   * @returns {Array} - Array of parameter combinations
   * @private
   */
  static _generateCombinations(paramRanges, paramNames, index = 0, current = {}, result = []) {
    if (index === paramNames.length) {
      result.push({...current});
      return result;
    }
    
    const paramName = paramNames[index];
    const values = paramRanges[paramName].values;
    
    for (const value of values) {
      current[paramName] = value;
      this._generateCombinations(paramRanges, paramNames, index + 1, current, result);
    }
    
    return result;
  }
  
  /**
   * Apply parameters to strategy
   * @param {Object} flowData - Strategy flow data
   * @param {Object} parameters - Parameters
   * @private
   */
  static _applyParametersToStrategy(flowData, parameters) {
    // Iterate through nodes and apply parameters where needed
    for (const node of flowData.nodes) {
      // Handle different node types
      switch (node.type) {
        case 'indicatorNode':
          // Check for indicator-specific parameters
          const indicatorParams = parameters[`${node.id}_${node.data.indicatorType.toLowerCase()}`];
          if (indicatorParams) {
            // Apply indicator parameters
            Object.assign(node.data, indicatorParams);
          }
          break;
          
        case 'conditionNode':
          // Check for threshold overrides
          const thresholdParam = parameters[`${node.id}_threshold`];
          if (thresholdParam !== undefined) {
            node.data.threshold = thresholdParam;
          }
          break;
          
        // Add other node types as needed
      }
    }
  }
}

module.exports = BacktestService;
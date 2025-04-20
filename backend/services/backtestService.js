// backend/services/backtestService.js
const ccxt = require('ccxt'); // Added in previous step
const StrategyCompiler = require('./strategyCompiler');
const MarketDataCache = require('../models/MarketDataCache'); // Added in previous step
const OptimizationJob = require('../models/OptimizationJob');
const MarketDataService = require('./marketDataService'); // Dependency for timeframe conversion
const ErrorResponse = require('../utils/errorResponse'); // Added in previous step

class BacktestService {
    /**
     * Constructor for the BacktestService
     * @param {Object} flowData - The flow data from the strategy builder
     * @param {Array<Object>} marketData - Historical market data (OHLCV objects with Date timestamps)
     * @param {Object} parameters - Optional parameters to override strategy defaults
     * @param {string} [strategyId] - Optional: ID of the strategy being backtested (for context)
     * @param {string} [userId] - Optional: ID of the user running the backtest (for context)
     * @param {Object} [options] - Optional backtest options (initialEquity, commission, etc.)
     */
    constructor(flowData, marketData, parameters = {}, strategyId = null, userId = null, options = {}) {
        this.flowData = flowData;
        this.marketData = marketData;
        this.parameters = parameters;
        this.strategyId = strategyId;
        this.userId = userId;
        this.options = {
            initialEquity: options.initialEquity || 10000,
            commissionPercent: options.commissionPercent || 0.1, // Example: 0.1% per trade
            // Add more options like slippage etc. later
        };

        const requiredWarmup = 100; // Min bars needed for indicators. Adjust as needed.
        if (!this.marketData || this.marketData.length < requiredWarmup) {
            // Allow backtest to proceed but log a warning, results might be unreliable
            console.warn(`[BacktestService Constructor] Insufficient market data. Need at least ${requiredWarmup} bars for full indicator warmup, got ${this.marketData?.length || 0}. Backtest may run but results could be affected.`);
            // Consider throwing error if less than a critical minimum (e.g., 20 bars)
            // if (!this.marketData || this.marketData.length < 20) {
            //    throw new Error(`Critically insufficient market data. Need at least 20 bars, got ${this.marketData?.length || 0}.`);
            // }
        }
        if (!flowData || !flowData.nodes || !flowData.edges) {
            throw new Error('Invalid strategy flowData provided.');
        }

        // Compile the strategy using the imported compiler
        try {
            this.compiledStrategy = StrategyCompiler.compileStrategy(flowData, parameters);
            if (!this.compiledStrategy) {
                throw new Error('Strategy compilation failed. Check strategy logic and node connections.');
            }
        } catch (compileError) {
            console.error("Strategy Compilation Error:", compileError);
            throw new Error(`Strategy compilation failed: ${compileError.message}`);
        }
    }

    /**
     * Run the backtest
     * @returns {Promise<Object>} - Backtest results object matching BacktestResult schema structure.
     */
    async run() {
        console.log(`[BacktestService] Running backtest with initial equity $${this.options.initialEquity}`);
        const results = {
            summary: {
                initialEquity: this.options.initialEquity,
                finalEquity: this.options.initialEquity,
                totalReturnPercent: 0,
                annualReturn: 0,
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                winRate: 0,
                profitFactor: 0,
                sharpeRatio: 0,
                sortinoRatio: 0, // Placeholder
                maxDrawdown: 0,
                maxDrawdownDuration: 0, // Placeholder
                averageTradeDuration: 0, // Placeholder
                averageWinPercent: 0, // Placeholder
                averageLossPercent: 0, // Placeholder
                expectancy: 0 // Placeholder
            },
            trades: [],
            equityCurve: [],
            monthlyReturns: [] // Placeholder
        };

        // Initialize backtest state
        let equity = this.options.initialEquity;
        const equityCurve = [];
        let position = null; // { type: 'LONG'/'SHORT', entryPrice: number, entryTime: Date, quantity: number }
        const trades = [];
        let totalProfit = 0;
        let totalLoss = 0;
        let winCount = 0;
        let lossCount = 0;
        const barReturns = []; // For Sharpe Ratio calculation

        // Track max drawdown
        let peakEquity = equity;
        let maxDrawdown = 0;

        // --- Backtest Loop ---
        const startIndex = 100; // Warm-up period
        if (startIndex >= this.marketData.length) {
            console.warn("[BacktestService] Not enough data for warm-up period.");
            // Fill in default summary values before returning
            results.summary.finalEquity = equity;
            // ... (set other summary values to 0 or defaults) ...
            return results; // Return empty results if not enough data
        }

        // Initial equity point before loop starts
        equityCurve.push({ timestamp: this.marketData[startIndex - 1]?.timestamp || new Date(), equity: equity }); // Added fallback for timestamp

        for (let i = startIndex; i < this.marketData.length; i++) {
            const currentBar = this.marketData[i];
            const previousBar = this.marketData[i - 1]; // Can be undefined if i=0, handled in _prepareData

            // 1. Prepare data for the strategy execution at step 'i'
            const dataForStrategy = this._prepareDataForStrategy(i);

            // Handle case where indicators couldn't be calculated
            if (!dataForStrategy.indicators) {
                equityCurve.push({ timestamp: currentBar.timestamp, equity });
                 if (i % 50 === 0) { // Log occasionally even if indicators are missing early on
                    console.log(`[Backtest Loop ${i}] Indicators not ready yet or data prep failed.`);
                }
                continue; // Skip to next bar
            }

            // 2. Execute the compiled strategy logic
            let signal = null;
            try {
                 signal = this.compiledStrategy.execute(dataForStrategy, position);

                 // --- START DEBUG LOGGING ---
                 if (signal) {
                     // Log HVER gang et signal genereres
                     console.log(`[Backtest Loop ${i}] Signal Generated: ${JSON.stringify(signal)}. Current Position: ${position ? position.type : 'None'}`);
                 } else if (i % 20 === 0) { // Logg status ca. hver 20. bar selv uten signal
                     // console.log(`[Backtest Loop ${i}] No signal. Position: ${position ? position.type : 'None'}. Close: ${currentBar.close}`);
                     // Valgfritt: Logg et par nøkkelindikatorverdier her for å se utviklingen
                     // const smaNodeId = Object.keys(dataForStrategy.indicators).find(k => k.startsWith('indicator_')); // Find an indicator node ID dynamically
                     // if (smaNodeId) console.log(` ---> Indicator (${smaNodeId}): ${JSON.stringify(dataForStrategy.indicators[smaNodeId]?.value)}`);
                 }
                 // --- END DEBUG LOGGING ---

            } catch (executionError) {
                console.error(`[BacktestService] Error executing strategy at bar ${i} (${currentBar.timestamp}): ${executionError.message}`);
                equityCurve.push({ timestamp: currentBar.timestamp, equity }); // Still record equity
                continue;
            }


            // 3. Process Signals & Simulate Trades
            const commissionAmount = this.options.commissionPercent / 100;

            // Handle EXIT Signal first (priority)
            if (signal && signal.action === 'EXIT' && position && position.type === signal.positionType) {
                const exitPrice = currentBar.close; // Assume exit at close of the signal bar
                const entryPrice = position.entryPrice;
                const quantity = position.quantity;
                let profit = 0;

                if (position.type === 'LONG') {
                    profit = (exitPrice - entryPrice) * quantity;
                } else { // SHORT
                    profit = (entryPrice - exitPrice) * quantity;
                }

                // Calculate commission for both entry and exit
                const entryCommission = entryPrice * quantity * commissionAmount;
                const exitCommission = exitPrice * quantity * commissionAmount;
                const totalCommission = entryCommission + exitCommission;
                const netProfit = profit - totalCommission;

                equity += netProfit; // Update equity with net profit

                const profitPercent = entryPrice !== 0 ? ((exitPrice / entryPrice) - 1) * 100 * (position.type === 'LONG' ? 1 : -1) : 0;

                // Record the completed trade
                const trade = {
                    entryTimestamp: position.entryTime,
                    exitTimestamp: currentBar.timestamp,
                    entryPrice: entryPrice,
                    exitPrice: exitPrice,
                    positionType: position.type,
                    quantity: quantity,
                    profit: netProfit,
                    profitPercent: profitPercent, // Percentage based on entry price before commission
                    commission: totalCommission,
                    duration: currentBar.timestamp.getTime() - position.entryTime.getTime() // Duration in ms
                };
                trades.push(trade);

                // Update trade statistics
                if (netProfit > 0) {
                    winCount++;
                    totalProfit += netProfit;
                } else {
                    lossCount++;
                    totalLoss += Math.abs(netProfit);
                }

                console.log(`[Backtest] EXIT ${position.type} @ ${exitPrice} on ${currentBar.timestamp.toISOString()}. P/L: $${netProfit.toFixed(2)}`);
                position = null; // Close the position

            }
            // Handle ENTRY Signal if flat
            else if (signal && signal.action === 'ENTRY' && !position) {
                const entryPrice = currentBar.close; // Assume entry at close of the signal bar

                // --- Simple Position Sizing Logic ---
                const riskAmount = 100; // Fixed amount to risk per trade
                const stopLossPercent = 0.02; // Assume 2% stop-loss distance for calculation
                const stopLossPrice = signal.positionType === 'LONG' ? entryPrice * (1 - stopLossPercent) : entryPrice * (1 + stopLossPercent);
                const priceDiffPerUnit = Math.abs(entryPrice - stopLossPrice);
                let quantity = 1; // Default quantity if calculation fails
                if (priceDiffPerUnit > 0) {
                   quantity = riskAmount / priceDiffPerUnit;
                   // Ensure quantity doesn't exceed available equity (basic check)
                   const positionValue = entryPrice * quantity;
                   if (positionValue > equity) {
                       console.warn(`[Backtest] Calculated position value ($${positionValue.toFixed(2)}) exceeds equity ($${equity.toFixed(2)}). Reducing quantity.`);
                       quantity = equity / entryPrice * 0.98; // Use 98% of equity to allow for fees/slippage
                   }
                } else {
                    console.warn(`[Backtest] Price difference for stop loss is zero or negative at bar ${i}. Cannot calculate quantity based on risk. Defaulting quantity to 1.`);
                    quantity = 1; // Fallback quantity
                    // Consider alternative sizing or skipping trade if risk calc fails
                }
                // Adjust precision based on asset type (e.g., BTC needs more decimals than stocks)
                // This is a guess; a better system would know the asset's precision.
                const precision = symbol.includes('BTC') || symbol.includes('ETH') ? 6 : 2;
                quantity = parseFloat(quantity.toFixed(precision));

                if (quantity <= 0) {
                   console.warn(`[Backtest] Calculated quantity is zero or negative (${quantity}) at bar ${i}. Skipping ENTRY.`);
                   signal = null; // Prevent entry if quantity is invalid
                } else {
                    position = {
                        type: signal.positionType,
                        entryPrice: entryPrice,
                        entryTime: currentBar.timestamp,
                        quantity: quantity
                    };
                     console.log(`[Backtest] ENTRY ${position.type} @ ${entryPrice} (Qty: ${quantity.toFixed(precision)}) on ${currentBar.timestamp.toISOString()}`);
                }
                // --- End Position Sizing Logic ---
            }

            // 4. Update Equity Curve and Drawdown
            equityCurve.push({ timestamp: currentBar.timestamp, equity });
            const previousEquity = equityCurve[equityCurve.length - 2]?.equity || this.options.initialEquity;
             if (previousEquity !== 0) {
               barReturns.push((equity / previousEquity) - 1); // Store bar return
             } else {
               barReturns.push(0);
             }


            if (equity > peakEquity) {
                peakEquity = equity;
            }
            const currentDrawdown = peakEquity > 0 ? (peakEquity - equity) / peakEquity * 100 : 0;
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }

        } // End backtest loop

        // --- Calculate Summary Statistics ---
        results.summary.finalEquity = equity;
        results.summary.totalReturnPercent = ((equity / results.summary.initialEquity) - 1) * 100;
        results.summary.totalTrades = trades.length;
        results.summary.winningTrades = winCount;
        results.summary.losingTrades = lossCount;
        results.summary.winRate = results.summary.totalTrades > 0 ? (winCount / results.summary.totalTrades) * 100 : 0;
        results.summary.profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);
        results.summary.maxDrawdown = maxDrawdown;

        // Calculate Annualized Return (approximation)
        const firstBarTime = this.marketData[startIndex]?.timestamp;
        const lastBarTime = this.marketData[this.marketData.length - 1]?.timestamp;

        if (firstBarTime && lastBarTime) {
            const durationMillis = lastBarTime.getTime() - firstBarTime.getTime();
            if (durationMillis > 0) {
               const durationYears = durationMillis / (1000 * 60 * 60 * 24 * 365.25);
                if (durationYears > 0) {
                   // Ensure base is not negative or zero before calculating power
                    const base = equity / results.summary.initialEquity;
                    if (base > 0) {
                        results.summary.annualReturn = (Math.pow(base, 1 / durationYears) - 1) * 100;
                    } else {
                         results.summary.annualReturn = -100; // Total loss
                    }
                }
            }
        }


        // Calculate Sharpe Ratio (simplified, assumes risk-free rate = 0)
        if (barReturns.length > 1) {
            const avgBarReturn = barReturns.reduce((sum, r) => sum + r, 0) / barReturns.length;
            const variance = barReturns.reduce((sum, r) => sum + Math.pow(r - avgBarReturn, 2), 0) / barReturns.length;
            const stdDevBarReturn = Math.sqrt(variance);

            const timeframeMillis = this.marketData.length > 1 ? this.marketData[1].timestamp.getTime() - this.marketData[0].timestamp.getTime() : 0;
            let barsPerYear = 252; // Default for daily
            if (timeframeMillis > 0) {
                const yearMillis = 365.25 * 24 * 60 * 60 * 1000;
                barsPerYear = yearMillis / timeframeMillis;
            }

            const annualizedReturn = avgBarReturn * barsPerYear; // Use average *bar* return annualized
            const annualizedStdDev = stdDevBarReturn * Math.sqrt(barsPerYear);

            results.summary.sharpeRatio = annualizedStdDev > 0 ? (annualizedReturn / annualizedStdDev) : 0; // Simplified Sharpe
        }

        // Assign final results
        results.trades = trades;
        results.equityCurve = equityCurve;
        // TODO: Calculate results.monthlyReturns

        console.log(`[BacktestService] Backtest finished. Final Equity: $${results.summary.finalEquity.toFixed(2)}, Trades: ${results.summary.totalTrades}, Win Rate: ${results.summary.winRate.toFixed(2)}%`);
        return results;
    } // End run()


    /**
     * Prepares the data needed for the strategy's execute method for a given index.
     * Calculates indicators based on data UP TO AND INCLUDING the current index `i`.
     * @param {number} i - The current index in the marketData array.
     * @returns {Object} - The dataForStrategy object { current, previous, indicators, previousIndicators }.
     * @private
     */
    _prepareDataForStrategy(i) {
        const lookback = 200; // Max lookback needed for indicators. Ensure this covers the longest period.
        const startIndex = Math.max(0, i - lookback + 1); // Start index for the window
        const currentWindow = this.marketData.slice(startIndex, i + 1); // Window includes current bar `i`

        // Need indicators calculated up to the *previous* bar for crossover checks etc.
        // So calculate indicators for window ending at i-1
        const prevWindow = this.marketData.slice(Math.max(0, startIndex -1) , i); // Window ends at bar i-1

        if (currentWindow.length === 0 || i < 1) {
             // Not enough data to calculate anything meaningful or no previous bar
            return {
                current: this.marketData[i],
                previous: null,
                indicators: null,
                previousIndicators: null
            };
        }

        try {
            const currentIndicators = this._calculateIndicators(currentWindow);
            const previousIndicators = this._calculateIndicators(prevWindow); // Calculate for the previous state

            // --- DEBUG LOGGING for data preparation ---
             /*
             if (i % 50 === 0) { // Log structure occasionally
                  console.log(`[Data Prep @ ${i}] Current Ind Keys:`, JSON.stringify(Object.keys(currentIndicators || {})));
                  console.log(`[Data Prep @ ${i}] Prev Ind Keys:`, JSON.stringify(Object.keys(previousIndicators || {})));
             }
             */
             // --- END DEBUG LOGGING ---

            return {
                current: this.marketData[i], // Bar at index i
                previous: this.marketData[i - 1], // Bar at index i-1
                indicators: currentIndicators, // Indicators calculated using data up to bar i
                previousIndicators: previousIndicators // Indicators calculated using data up to bar i-1
            };
        } catch (calcError) {
             console.error(`[BacktestService] Error preparing data for index ${i}: ${calcError.message}`);
            // Return null indicators if calculation fails
            return {
                current: this.marketData[i],
                previous: this.marketData[i - 1],
                indicators: null,
                previousIndicators: null
            };
        }
    }

    /**
     * Calculates all required indicators for a given data window.
     * The results are keyed by the indicator node's ID from the flowData.
     * @param {Array<Object>} dataWindow - The window of market data (OHLCV objects).
     * @returns {Object|null} - An object where keys are node IDs and values are indicator results, or null if calculation fails.
     * @private
     */
    _calculateIndicators(dataWindow) {
        const indicators = {};
        if (!dataWindow || dataWindow.length === 0) {
            return indicators; // Return empty if no data
        }

        // Find all indicator nodes defined in the strategy flow
        const indicatorNodes = this.flowData.nodes.filter(node => node.type === 'indicatorNode');

        for (const node of indicatorNodes) {
            const nodeId = node.id; // Use the node's ID as the key
            // Use potentially overridden parameters if they exist for this node ID
            const nodeParams = { ...node.data, ...(this.parameters[nodeId] || {}) };
            const { indicatorType, ...params } = nodeParams;

            try {
                let result;
                // Call the appropriate helper function based on type
                switch (indicatorType) {
                    case 'SMA':
                        result = this._calculateSMA(dataWindow, params.period || 20);
                        break;
                    case 'EMA':
                        result = this._calculateEMA(dataWindow, params.period || 20);
                        break;
                    case 'RSI':
                         result = this._calculateRSI(dataWindow, params.period || 14);
                        break;
                    case 'MACD':
                        result = this._calculateMACD(
                            dataWindow,
                            params.fastPeriod || 12,
                            params.slowPeriod || 26,
                            params.signalPeriod || 9
                        );
                        break;
                    // Add cases for BBANDS, STOCH, etc. if implemented
                    default:
                        console.warn(`[BacktestService] Unsupported indicator type in flowData: ${indicatorType} for node ${nodeId}`);
                        result = { value: null, values: null }; // Indicate unsupported type
                }
                // Ensure result is always an object, even if calculation returns null/undefined
                indicators[nodeId] = result && typeof result === 'object' ? result : { value: result ?? null };

            } catch (calcError) {
                console.error(`[BacktestService] Error calculating indicator ${indicatorType} for node ${nodeId}: ${calcError.message}`);
                indicators[nodeId] = { value: null, values: null }; // Indicate calculation failure
            }
        }
        return indicators; // Return object keyed by node ID
    }


    // --- Indicator Calculation Helper Functions ---
    // Ensure these return { value: latestValue, values: [...fullArray] }
    // Handle insufficient data gracefully by returning nulls or empty results.

    _calculateSMA(data, period) {
        if (!data || data.length < period || period <= 0) {
            return { value: null, values: Array(data?.length || 0).fill(null) };
        }
        const closePrices = data.map(d => d.close);
        const smaValues = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
               smaValues.push(null);
            } else {
               let sum = 0;
               for (let j = 0; j < period; j++) {
                   sum += closePrices[i - j];
               }
               smaValues.push(sum / period);
            }
        }
        return { value: smaValues[smaValues.length - 1], values: smaValues };
    }

    _calculateEMA(data, period) {
         if (!data || data.length < period || period <= 0) {
            return { value: null, values: Array(data?.length || 0).fill(null) };
        }
        const closePrices = data.map(d => d.close);
        const emaValues = Array(data.length).fill(null);
        const multiplier = 2 / (period + 1);

        // Calculate initial SMA for the first EMA value
        let smaSum = 0;
        for(let i = 0; i < period; i++) {
            smaSum += closePrices[i];
        }
         let prevEma = smaSum / period;
         emaValues[period - 1] = prevEma; // First EMA is the SMA

        // Calculate subsequent EMA values
        for (let i = period; i < data.length; i++) {
            const currentEma = (closePrices[i] - prevEma) * multiplier + prevEma;
            emaValues[i] = currentEma;
            prevEma = currentEma;
        }
        return { value: emaValues[emaValues.length - 1], values: emaValues };
    }

    _calculateRSI(data, period) {
         if (!data || data.length < period + 1 || period <= 0) {
             return { value: null, values: Array(data?.length || 0).fill(null) };
        }
        const closePrices = data.map(d => d.close);
        const rsiValues = Array(data.length).fill(null);
        let avgGain = 0;
        let avgLoss = 0;

         // Calculate initial average gains and losses
         for (let i = 1; i <= period; i++) {
             const change = closePrices[i] - closePrices[i - 1];
             if (change > 0) avgGain += change;
             else avgLoss += Math.abs(change);
         }
         avgGain /= period;
         avgLoss /= period;

        const calculateRsiValue = (gain, loss) => {
            if (loss === 0) return 100;
            if (gain === 0) return 0;
            const rs = gain / loss;
            return 100 - (100 / (1 + rs));
        };

        rsiValues[period] = calculateRsiValue(avgGain, avgLoss);

        // Calculate subsequent RSI values using Wilder's smoothing
         for (let i = period + 1; i < data.length; i++) {
             const change = closePrices[i] - closePrices[i - 1];
             const currentGain = change > 0 ? change : 0;
             const currentLoss = change < 0 ? Math.abs(change) : 0;

             avgGain = (avgGain * (period - 1) + currentGain) / period;
             avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

             rsiValues[i] = calculateRsiValue(avgGain, avgLoss);
         }

        return { value: rsiValues[rsiValues.length - 1], values: rsiValues };
    }

   _calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
         if (!data || data.length < slowPeriod || fastPeriod <= 0 || slowPeriod <= 0 || signalPeriod <= 0 || fastPeriod >= slowPeriod) {
             const emptyValues = { macd: null, signal: null, histogram: null };
             return { value: emptyValues, values: { macd: Array(data?.length || 0).fill(null), signal: Array(data?.length || 0).fill(null), histogram: Array(data?.length || 0).fill(null) } };
         }

         const fastEMA = this._calculateEMA(data, fastPeriod);
         const slowEMA = this._calculateEMA(data, slowPeriod);

         const macdLine = Array(data.length).fill(null);
         for (let i = slowPeriod - 1; i < data.length; i++) {
            if (fastEMA.values[i] !== null && slowEMA.values[i] !== null) {
                 macdLine[i] = fastEMA.values[i] - slowEMA.values[i];
            }
         }

         const macdValuesForSignal = macdLine.filter(val => val !== null).map(val => ({ close: val }));

          if (macdValuesForSignal.length < signalPeriod) {
              const emptyResult = { macd: macdLine[macdLine.length - 1], signal: null, histogram: null };
              return { value: emptyResult, values: { macd: macdLine, signal: Array(data.length).fill(null), histogram: Array(data.length).fill(null) }};
          }

          const signalLineEmaResult = this._calculateEMA(macdValuesForSignal, signalPeriod);

         const signalLine = Array(data.length).fill(null);
         let signalIndex = 0;
         for(let i = 0; i < data.length; i++) {
             if (macdLine[i] !== null) {
                 if(signalIndex < signalLineEmaResult.values.length) {
                    signalLine[i] = signalLineEmaResult.values[signalIndex];
                 }
                 signalIndex++;
             }
         }

         const histogram = Array(data.length).fill(null);
         for (let i = 0; i < data.length; i++) {
             if (macdLine[i] !== null && signalLine[i] !== null) {
                 histogram[i] = macdLine[i] - signalLine[i];
             }
         }

         const latestMacd = macdLine[macdLine.length - 1];
         const latestSignal = signalLine[signalLine.length - 1];
         const latestHistogram = histogram[histogram.length - 1];

         return {
             value: {
                 macd: latestMacd,
                 signal: latestSignal,
                 histogram: latestHistogram
             },
             values: {
                 macd: macdLine,
                 signal: signalLine,
                 histogram: histogram
             }
         };
     }


    // --- Static Optimization Methods ---
    // These remain largely unchanged from previous versions but might need adaptation
    // to ensure they correctly use the new constructor/run methods if called directly.
    static async startOptimization(flowData, marketData, parameters, optimizationTarget, userId, strategyId) {
        console.warn("[BacktestService] Optimization started (simulation).");
        let optimizationJob;
        try {
            optimizationJob = await OptimizationJob.create({
                user: userId,
                strategy: strategyId,
                parameters: parameters, // Should define ranges here
                optimizationTarget: optimizationTarget,
                status: 'PENDING'
            });

            // Run optimization asynchronously
            setImmediate(async () => {
              try {
                 console.log(`[BacktestService] Running optimization job ${optimizationJob._id}`);
                 // NOTE: 'this' inside setImmediate refers to the Timeout object, not BacktestService.
                 // We need to call _runOptimization statically.
                 const best = await BacktestService._runOptimization(
                     optimizationJob._id,
                     flowData,
                     marketData,
                     parameters,
                     optimizationTarget,
                     userId,
                     strategyId
                 );
                 console.log(`[BacktestService] Optimization ${optimizationJob._id} completed. Best params:`, best?.parameters);
                 await OptimizationJob.findByIdAndUpdate(optimizationJob._id, { // Use job ID directly
                     status: 'COMPLETED',
                     completedAt: new Date(),
                     bestParameters: best?.parameters,
                     bestResultSummary: best?.results?.summary,
                     progress: 100 // Ensure progress is 100
                 });
              } catch (error) {
                 console.error(`[BacktestService] Optimization job ${optimizationJob._id} failed:`, error);
                 await OptimizationJob.findByIdAndUpdate(optimizationJob._id, { // Use job ID directly
                     status: 'FAILED',
                     error: error.message,
                     completedAt: new Date()
                 });
              }
            });
            return optimizationJob; // Return job details immediately
        } catch (jobCreateError) {
            console.error("Failed to create optimization job:", jobCreateError);
            throw new ErrorResponse("Could not start optimization job.", 500);
        }
      }

    static async _runOptimization(jobId, flowData, marketData, parameterRanges, optimizationTarget, userId, strategyId) {
        console.log("[BacktestService] Starting _runOptimization for job:", jobId);
        await OptimizationJob.findByIdAndUpdate(jobId, { status: 'RUNNING', startedAt: new Date() });

        // 1. Generate Parameter Combinations
        const paramNames = Object.keys(parameterRanges);
        const generateValues = (range) => {
            const values = [];
            if (range && typeof range.min === 'number' && typeof range.max === 'number' && typeof range.step === 'number' && range.step > 0) {
                for (let v = range.min; v <= range.max; v += range.step) {
                    values.push(parseFloat(v.toFixed(5))); // Handle potential floating point issues
                }
            } else if (Array.isArray(range.values)) {
                 return range.values; // If specific values are provided
            } else {
                 console.warn("Invalid parameter range definition:", range);
            }
            return values;
        };

         // Create structure { nodeId_paramName: [value1, value2,...] }
        const rangesPerParam = {};
        for (const nodeId in parameterRanges) {
            for (const paramName in parameterRanges[nodeId]) {
                 const key = `${nodeId}_${paramName}`; // e.g., indicator_1_period
                 rangesPerParam[key] = generateValues(parameterRanges[nodeId][paramName]);
            }
        }
        const flatParamNames = Object.keys(rangesPerParam).filter(key => rangesPerParam[key].length > 0); // Only use params with actual values


        // Recursive function to generate combinations
        const generateCombinations = (index = 0, currentCombination = {}, allCombinations = []) => {
            if (index === flatParamNames.length) {
                allCombinations.push({ ...currentCombination });
                return allCombinations;
            }

            const key = flatParamNames[index];
            const values = rangesPerParam[key];

            // This check should be redundant due to filter above, but keep for safety
            if (!values || values.length === 0) {
                 return generateCombinations(index + 1, currentCombination, allCombinations);
            }


            for (const value of values) {
                currentCombination[key] = value;
                generateCombinations(index + 1, currentCombination, allCombinations);
            }
            delete currentCombination[key]; // Backtrack

            return allCombinations;
        };

        const combinations = generateCombinations();
        const totalCombinations = combinations.length;
         console.log(`[BacktestService] Generated ${totalCombinations} parameter combinations.`);
         if(totalCombinations === 0) {
             await OptimizationJob.findByIdAndUpdate(jobId, {
                 status: 'FAILED',
                 error: 'No parameter combinations generated. Check parameter range definitions.',
                 completedAt: new Date()
            });
            throw new Error("No parameter combinations generated.");
         }

        // 2. Run Backtest for Each Combination
        const results = [];
        let bestResult = null;
        let bestScore = -Infinity; // Initialize based on optimization target (lower might be better for drawdown)
        const isMinimizingTarget = ['maxDrawdown'].includes(optimizationTarget); // Example for minimization


        for (let i = 0; i < totalCombinations; i++) {
            const flatParams = combinations[i];
             const nestedParams = {};
             for (const key in flatParams) {
                 const parts = key.split('_');
                 const nodeId = parts.slice(0, -1).join('_'); // Handle node IDs like 'indicator_1'
                 const paramName = parts[parts.length - 1];
                 if (!nestedParams[nodeId]) nestedParams[nodeId] = {};
                 nestedParams[nodeId][paramName] = flatParams[key];
             }

            try {
                // Create new BacktestService instance with current parameters
                const backtest = new BacktestService(flowData, marketData, nestedParams, strategyId, userId);
                const backtestResults = await backtest.run();

                 results.push({ parameters: nestedParams, results: backtestResults });

                 let currentScore = backtestResults.summary[optimizationTarget];
                 if (currentScore === undefined || currentScore === null || isNaN(currentScore)) {
                    currentScore = -Infinity;
                    console.warn(`[BacktestService Opt] Target '${optimizationTarget}' invalid/missing for params:`, nestedParams);
                 }

                 if (isMinimizingTarget) {
                     currentScore = -currentScore; // Invert score for minimization
                 }


                 if (currentScore > bestScore) {
                     bestScore = currentScore;
                     bestResult = { parameters: nestedParams, results: backtestResults };
                 }

            } catch (runError) {
                 console.error(`[BacktestService Opt] Run failed for params ${JSON.stringify(nestedParams)}: ${runError.message}`);
            }


            // Update job progress
            const progress = Math.round(((i + 1) / totalCombinations) * 100);
            // Avoid excessive DB updates, maybe update every 5% or every 20 iterations
            if (i % 20 === 0 || progress === 100) {
                 await OptimizationJob.findByIdAndUpdate(jobId, { progress });
            }
             if (i % 50 === 0) { // Log progress occasionally
                  console.log(`[BacktestService Opt] Progress: ${progress}% (${i + 1}/${totalCombinations})`);
             }
        }

         console.log(`[BacktestService Opt] Finished. Best score (${optimizationTarget}${isMinimizingTarget ? ' minimized' : ''}): ${isMinimizingTarget ? -bestScore : bestScore}`);
        return bestResult; // Return the best result found
    }

} // End class BacktestService

module.exports = BacktestService;
// backend/controllers/marketDataController.js
const asyncHandler = require('../middleware/async'); // Assuming async handler middleware exists
const ErrorResponse = require('../utils/errorResponse'); // Assuming error response utility exists
const MarketDataService = require('../services/marketDataService'); // Importer den oppdaterte servicen

// @desc    Get Historical Market Data
// @route   GET /api/market-data?exchange=...&symbol=...&timeframe=...&startDate=...&endDate=...
// @access  Private (eller Public, avhengig av behov)
exports.getHistoricalData = asyncHandler(async (req, res, next) => {
    const { exchange, symbol, timeframe, startDate, endDate } = req.query;

    // --- Validering ---
    if (!exchange || !symbol || !timeframe || !startDate || !endDate) {
        return next(new ErrorResponse('Mangler påkrevde parametere: exchange, symbol, timeframe, startDate, endDate', 400));
    }

    // Valider datoformat (enkel sjekk)
    const start = Date.parse(startDate);
    const end = Date.parse(endDate);
    if (isNaN(start) || isNaN(end)) {
        return next(new ErrorResponse('Ugyldig datoformat for startDate eller endDate', 400));
    }
    if (start >= end) {
         return next(new ErrorResponse('startDate må være før endDate', 400));
    }

    // --- Kall Service ---
    // Service vil nå håndtere caching og API-kall
    const data = await MarketDataService.getHistoricalData(
        exchange,
        symbol,
        timeframe,
        new Date(start),
        new Date(end)
    );

    // --- Send Respons ---
    res.status(200).json({
        success: true,
        count: data.length,
        data: data
    });
});

// @desc    Get Available Symbols for an Exchange
// @route   GET /api/market-data/symbols/:exchange
// @access  Private (example)
exports.getAvailableSymbols = asyncHandler(async (req, res, next) => {
    const { exchange } = req.params;
    if (!exchange) {
        return next(new ErrorResponse('Mangler parameter: exchange', 400));
    }
    const symbols = await MarketDataService.getAvailableSymbols(exchange);
    res.status(200).json({ success: true, count: symbols.length, data: symbols });
});

// @desc    Get Available Timeframes for an Exchange
// @route   GET /api/market-data/timeframes/:exchange
// @access  Private (example)
exports.getAvailableTimeframes = asyncHandler(async (req, res, next) => {
    const { exchange } = req.params;
     if (!exchange) {
        return next(new ErrorResponse('Mangler parameter: exchange', 400));
    }
    const timeframes = await MarketDataService.getAvailableTimeframes(exchange);
    res.status(200).json({ success: true, count: timeframes.length, data: timeframes });
});
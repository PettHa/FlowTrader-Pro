// backend/routes/marketDataRoutes.js
const express = require('express');

// Importer controller-funksjoner
const {
    getHistoricalData,
    getAvailableSymbols,
    getAvailableTimeframes
} = require('../controllers/marketDataController'); // Bruker nå de faktiske controller-funksjonene

// Importer authentication middleware hvis nødvendig
const { protect } = require('../middleware/auth');

const router = express.Router();

// Route for getting historical data
// GET /api/market-data?exchange=...&symbol=...&timeframe=...&startDate=...&endDate=...
router.get('/', protect, getHistoricalData); // Legg til protect hvis nødvendig

// Route for getting available symbols for an exchange
// GET /api/market-data/symbols/:exchange
router.get('/symbols/:exchange', protect, getAvailableSymbols); // Legg til protect

// Route for getting available timeframes for an exchange
// GET /api/market-data/timeframes/:exchange
router.get('/timeframes/:exchange', protect, getAvailableTimeframes); // Legg til protect


module.exports = router;
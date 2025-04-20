// backend/controllers/strategyController.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
// const Strategy = require('../models/Strategy'); // Trengs kanskje ikke direkte
const StrategyService = require('../services/strategyService'); // Importer StrategyService

// @desc    Get all strategies for the logged-in user
// @route   GET /api/strategies
// @access  Private
exports.getStrategies = asyncHandler(async (req, res, next) => {
    // req.user er satt av protect middleware
    const strategies = await StrategyService.getStrategiesForUser(req.user.id);
    res.status(200).json({
        success: true,
        count: strategies.length,
        data: strategies
    });
});

// @desc    Get a single strategy by ID
// @route   GET /api/strategies/:id
// @access  Private
exports.getStrategy = asyncHandler(async (req, res, next) => {
     // Håndter tilfellet der ID er 'new' - dette skal egentlig ikke nå backend
     // Frontend bør ikke kalle API for 'new', men heller håndtere det lokalt
     if (req.params.id === 'new') {
          // Kan returnere en tom mal eller en feil
          // Her velger vi å si at 'new' ikke er en gyldig ID
          return next(new ErrorResponse(`Strategi med ID ${req.params.id} ikke funnet`, 404));
      }

    const strategy = await StrategyService.getStrategyById(req.params.id, req.user.id);
    // StrategyService vil kaste 404 hvis ikke funnet
    res.status(200).json({
        success: true,
        data: strategy
    });
});

// @desc    Create a new strategy
// @route   POST /api/strategies
// @access  Private
exports.createStrategy = asyncHandler(async (req, res, next) => {
    // Legg til bruker ID fra protect middleware
    const strategyData = { ...req.body }; // Ikke legg user her, det gjøres i service
    // Enkel validering
    if (!strategyData.name || !strategyData.flowData) {
         return next(new ErrorResponse('Navn og flowData er påkrevd for å opprette strategi', 400));
    }

    const newStrategy = await StrategyService.createStrategy(strategyData, req.user.id);
    res.status(201).json({
        success: true,
        data: newStrategy
    });
});

// @desc    Update a strategy by ID
// @route   PUT /api/strategies/:id
// @access  Private
exports.updateStrategy = asyncHandler(async (req, res, next) => {
    // Sjekk om ID er 'new'
     if (req.params.id === 'new') {
          return next(new ErrorResponse('Kan ikke oppdatere en strategi med ID "new"', 400));
      }
    const updatedStrategy = await StrategyService.updateStrategy(req.params.id, req.body, req.user.id);
    res.status(200).json({
        success: true,
        data: updatedStrategy
    });
});

// @desc    Delete a strategy by ID
// @route   DELETE /api/strategies/:id
// @access  Private
exports.deleteStrategy = asyncHandler(async (req, res, next) => {
    // Sjekk om ID er 'new'
     if (req.params.id === 'new') {
          return next(new ErrorResponse('Kan ikke slette en strategi med ID "new"', 400));
      }
    await StrategyService.deleteStrategy(req.params.id, req.user.id);
    res.status(200).json({
        success: true,
        data: {} // Ingen data å returnere etter sletting
    });
});

// @desc    Activate a strategy for live trading
// @route   POST /api/strategies/:id/activate
// @access  Private
exports.activateStrategy = asyncHandler(async (req, res, next) => {
     if (req.params.id === 'new') {
          return next(new ErrorResponse('Kan ikke aktivere en strategi med ID "new"', 400));
     }
    // TODO: Trenger exchangeId her? Sendes fra frontend?
    // const { exchangeId } = req.body;
    // if (!exchangeId) return next(new ErrorResponse('Exchange ID er påkrevd for aktivering', 400));

    const strategy = await StrategyService.activateStrategy(req.params.id, req.user.id);
    // TODO: Trigger TradingService.startStrategy(...) her ELLER i StrategyService
    // await TradingService.startStrategy(req.params.id, req.user.id, exchangeId);
    res.status(200).json({ success: true, message: 'Strategi aktivert (simulert)', data: strategy });
});

// @desc    Deactivate a strategy for live trading
// @route   POST /api/strategies/:id/deactivate
// @access  Private
exports.deactivateStrategy = asyncHandler(async (req, res, next) => {
    if (req.params.id === 'new') {
          return next(new ErrorResponse('Kan ikke deaktivere en strategi med ID "new"', 400));
     }
    const strategy = await StrategyService.deactivateStrategy(req.params.id, req.user.id);
     // TODO: Trigger TradingService.stopStrategy(...) her ELLER i StrategyService
     // await TradingService.stopStrategy(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Strategi deaktivert (simulert)', data: strategy });
});
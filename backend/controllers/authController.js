// backend/controllers/authController.js
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User'); // Importer User model
const AuthService = require('../services/authService'); // Importer AuthService

// Hjelpefunksjon for å sende token som respons
const sendTokenResponse = (user, statusCode, res) => {
    const token = AuthService.generateToken(user); // Bruk AuthService for token

    // Alternativer for å sende token (cookie er sikrere for web)
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000), // Fra .env
        httpOnly: true // Viktig for sikkerhet
    };
    if (process.env.NODE_ENV === 'production') {
        options.secure = true; // Send kun over HTTPS i produksjon
    }

    // Fjern passord før brukerobjektet sendes
    const userResponse = { ...user._doc }; // Klon for å unngå å endre original
    delete userResponse.password;

    res
        .status(statusCode)
        // .cookie('token', token, options) // Alternativ 1: Send som httpOnly cookie
        .json({ success: true, token, data: userResponse }); // Alternativ 2: Send token i body (vanlig for APIer)
};


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return next(new ErrorResponse('Vennligst oppgi navn, e-post og passord', 400));
    }

    try {
        const user = await AuthService.register(name, email, password);
        sendTokenResponse(user, 201, res); // Send 201 Created status
    } catch (error) {
        // Feil fra AuthService (f.eks. duplicate email) vil bli fanget her
        next(error); // Send til errorHandler
    }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorResponse('Vennligst oppgi e-post og passord', 400));
    }

    try {
        const user = await AuthService.login(email, password);
        sendTokenResponse(user, 200, res);
    } catch (error) {
        // Feil fra AuthService (f.eks. invalid credentials) vil bli fanget her
        next(error); // Send til errorHandler
    }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    // req.user skal være satt av 'protect' middleware
    if (!req.user || !req.user.id) {
        return next(new ErrorResponse('Bruker ikke funnet (fra token)', 404)); // Eller 401
    }

     // Hent fersk brukerdata (uten passord)
     const user = await AuthService.getUserById(req.user.id);
     if (!user) {
         // Burde ikke skje hvis token er gyldig og protect fungerer, men greit med sjekk
          return next(new ErrorResponse('Bruker ikke funnet i database', 404));
     }

    res.status(200).json({ success: true, data: user });
});

// --- Placeholders for andre funksjoner ---
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    res.status(501).json({ success: false, message: 'Forgot password endpoint not implemented' });
});
exports.resetPassword = asyncHandler(async (req, res, next) => {
    res.status(501).json({ success: false, message: 'Reset password endpoint not implemented' });
});
exports.updateDetails = asyncHandler(async (req, res, next) => {
    res.status(501).json({ success: false, message: 'Update details endpoint not implemented' });
});
exports.updatePassword = asyncHandler(async (req, res, next) => {
    res.status(501).json({ success: false, message: 'Update password endpoint not implemented' });
});
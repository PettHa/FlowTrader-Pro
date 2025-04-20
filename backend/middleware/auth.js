// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const config = require('../config');
const AuthService = require('../services/authService'); // Importer AuthService

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // else if (req.cookies.token) { // Hvis du bruker cookies
  //   token = req.cookies.token;
  // }

  if (!token) {
    return next(new ErrorResponse('Ikke autorisert til å aksessere denne ruten (ingen token)', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('Decoded JWT:', decoded); // { id: '...', role: '...', iat: ..., exp: ... }

    // Hent bruker fra DB basert på decoded.id
    // Viktig: Hent brukeren for å sikre at den fortsatt eksisterer og for å få fersk data
    const user = await AuthService.getUserById(decoded.id);

    if (!user) {
        // Selv om token er gyldig, finnes ikke brukeren lenger
        return next(new ErrorResponse('Brukeren tilknyttet dette tokenet finnes ikke lenger.', 401));
    }

    // Legg brukerobjektet (uten passord) til requesten
    req.user = user;

    next();
  } catch (err) {
     console.error("Token verification failed:", err.message);
    // Håndter ulike JWT feil
    if (err.name === 'JsonWebTokenError') {
        return next(new ErrorResponse('Ikke autorisert til å aksessere denne ruten (ugyldig token)', 401));
    } else if (err.name === 'TokenExpiredError') {
        return next(new ErrorResponse('Ikke autorisert til å aksessere denne ruten (token utløpt)', 401));
    }
    // Annen feil under verifisering
    return next(new ErrorResponse('Ikke autorisert til å aksessere denne ruten (token feilet)', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Antar at req.user er satt av protect middleware
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Brukerrollen ${req.user?.role || 'ingen'} har ikke tilgang til denne ruten`,
          403 // Forbidden
        )
      );
    }
    next();
  };
};
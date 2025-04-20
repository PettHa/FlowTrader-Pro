// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();

// Importer spesifikke controller methods
const {
  register,
  login,
  getMe,
  // forgotPassword, // Uncomment når implementert
  // resetPassword, // Uncomment når implementert
  // updateDetails, // Uncomment når implementert
  // updatePassword // Uncomment når implementert
} = require('../controllers/authController'); // Endret fra placeholder

// Importer middleware
const { protect } = require('../middleware/auth');
// const { validateRegistration, validateLogin } = require('../middleware/validator'); // Eksempel validators (uncomment når klare)

// --- Faktiske Auth Ruter ---
router.post('/register', /* validateRegistration, */ register); // Koble til register controller
router.post('/login', /* validateLogin, */ login);       // Koble til login controller
router.get('/me', protect, getMe);                         // Koble til getMe controller (beskyttet)

// --- Uncomment disse etter hvert som jeg implementerer dem ---
// router.put('/updatedetails', protect, updateDetails);
// router.put('/updatepassword', protect, updatePassword);
// router.post('/forgotpassword', forgotPassword);
// router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
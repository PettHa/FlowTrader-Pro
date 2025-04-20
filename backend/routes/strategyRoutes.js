// backend/routes/strategyRoutes.js
const express = require('express');
const router = express.Router();

// Importer controller-funksjoner
const {
  getStrategies,
  getStrategy,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  activateStrategy,
  deactivateStrategy
} = require('../controllers/strategyController'); // Sørg for at stien er riktig

// Importer middleware
const { protect } = require('../middleware/auth');
// const { authorize } = require('../middleware/auth'); // Hvis du trenger rollebasert tilgang
// const { validateStrategy } = require('../middleware/validator'); // Eksempel validator

// --- Strategy Routes ---

// Hent alle strategier for brukeren / Opprett ny strategi
router.route('/')
  .get(protect, getStrategies)       // GET /api/strategies
  .post(protect, /* validateStrategy, */ createStrategy); // POST /api/strategies

// Spesifikke handlinger for en strategi med ID
// VIKTIG: Ruter med parametere (som :id) må komme ETTER mer generelle ruter (som /new hvis du hadde hatt det)
// Men siden vi håndterer 'new' i frontend, trenger vi ikke en egen /new rute her.
router.route('/:id')
  .get(protect, getStrategy)         // GET /api/strategies/:id
  .put(protect, /* validateStrategy, */ updateStrategy) // PUT /api/strategies/:id
  .delete(protect, deleteStrategy);    // DELETE /api/strategies/:id

// Aktiver/deaktiver strategi for live trading
router.post('/:id/activate', protect, activateStrategy);    // POST /api/strategies/:id/activate
router.post('/:id/deactivate', protect, deactivateStrategy); // POST /api/strategies/:id/deactivate

module.exports = router;
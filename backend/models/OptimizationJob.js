// backend/models/OptimizationJob.js
const mongoose = require('mongoose');

const OptimizationJobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  strategy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Strategy',
    required: true,
    index: true
  },
  // Parametrene som ble forsøkt optimalisert, inkludert ranges/steps
  parameters: {
    type: Object,
    required: true
  },
  // Hvilken metrikk som ble optimalisert for (f.eks. 'sharpeRatio', 'profitFactor')
  optimizationTarget: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  progress: { // Prosent fullført (0-100)
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Beste parameterkombinasjon funnet
  bestParameters: {
    type: Object
  },
  // Beste resultat (summary) funnet
  bestResultSummary: {
    type: Object
  },
  // Eventuell feilmelding hvis jobben feilet
  error: {
    type: String
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true // Legger til createdAt og updatedAt automatisk
});

// Indeks for raskere oppslag av brukerens jobber
OptimizationJobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('OptimizationJob', OptimizationJobSchema);
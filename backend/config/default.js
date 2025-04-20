// backend/config/default.js - RECOMMENDED VERSION
module.exports = {
    port: 5000,
    host: '0.0.0.0',
    // Default database connection string for development
    dbUri: 'mongodb://localhost:27017/flowtrader_dev',
    // Default JWT expiration
    jwtExpire: '30d',
    // Default CORS settings (restrictive is safer for a default)
    corsOrigins: ['http://localhost:3000'], // Only allow default React port
    // --- Secrets - MUST be overridden by environment variables ---
    // Provide null or easily identifiable placeholders for required secrets
    jwtSecret: null, // Forces setting via .env or environment
    encryptionKey: null, // Forces setting via .env or environment
    encryptionIv: null, // Forces setting via .env or environment
    // Optional: Add a message indicating these need overrides
    // secretsWarning: 'CRITICAL: jwtSecret, encryptionKey, encryptionIv MUST be set via environment variables!'
};
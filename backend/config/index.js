// backend/config/index.js
const path = require('path');
const fs = require('fs');
const _ = require('lodash'); // Using lodash for deep merging (install if needed: npm install lodash)
// Alternatively, you can use Object.assign for shallow merging if you prefer.

// Determine the current environment, default to 'development'
const env = process.env.NODE_ENV || 'development';

// Load default configuration
let baseConfig = {};
const defaultConfigPath = path.join(__dirname, 'default.js');
if (fs.existsSync(defaultConfigPath)) {
    baseConfig = require('./default');
} else {
    console.warn('Warning: backend/config/default.js not found.');
}

// Load environment-specific configuration
let envConfig = {};
const envConfigPath = path.join(__dirname, `${env}.js`);
if (fs.existsSync(envConfigPath)) {
    envConfig = require(`./${env}.js`);
    console.log(`Loading configuration for environment: ${env}`);
} else {
    console.log(`No specific configuration file found for environment: ${env}. Using default.`);
}

// Deep merge the environment config over the default config
// Lodash's merge handles nested objects better than Object.assign
const mergedConfig = _.merge({}, baseConfig, envConfig);

// --- Add Environment Variable Overrides (Important!) ---
// Allow overriding config values with environment variables for deployment flexibility
// Example:
mergedConfig.port = process.env.PORT || mergedConfig.port || 5000;
mergedConfig.dbUri = process.env.MONGODB_URI || mergedConfig.dbUri; // Example for DB URI
mergedConfig.jwtSecret = process.env.JWT_SECRET || mergedConfig.jwtSecret;
mergedConfig.jwtExpire = process.env.JWT_EXPIRE || mergedConfig.jwtExpire;
mergedConfig.corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : mergedConfig.corsOrigins || '*';
mergedConfig.encryptionKey = process.env.ENCRYPTION_KEY || mergedConfig.encryptionKey; // Needed for Exchange model
mergedConfig.encryptionIv = process.env.ENCRYPTION_IV || mergedConfig.encryptionIv; // Needed for Exchange model

// Add the current environment name to the config object for reference
mergedConfig.env = env;

// Ensure essential keys exist after merging and overrides
if (!mergedConfig.jwtSecret) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in config or environment variables.');
    process.exit(1);
}
if (!mergedConfig.dbUri) {
    console.error('FATAL ERROR: MONGODB_URI (or dbUri) is not defined in config or environment variables.');
    process.exit(1);
}
// Add checks for encryption keys if Exchange model is used
if (!mergedConfig.encryptionKey || !mergedConfig.encryptionIv) {
    console.warn('WARNING: ENCRYPTION_KEY or ENCRYPTION_IV is not defined. Exchange API keys cannot be securely stored.');
    // Consider exiting if encryption is mandatory: process.exit(1);
}


module.exports = mergedConfig;
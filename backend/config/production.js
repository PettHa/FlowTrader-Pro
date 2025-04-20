// backend/config/production.js
module.exports = {
    port: process.env.PORT || 8080, // Use environment variable PORT if set
    host: '0.0.0.0',
    // Use environment variable for production DB URI
    dbUri: process.env.MONGODB_URI || 'mongodb://prod_user:prod_pass@prod_host:27017/flowtrader_prod',
    // Use strong, environment-variable based JWT secret in production
    jwtSecret: process.env.JWT_SECRET, // Should be set in your production environment
    jwtExpire: '7d', // Shorter expiry for production?
    // Define allowed origins for production frontend/apps
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['https://your-production-frontend.com'],
    // Get encryption keys from environment variables in production
    encryptionKey: process.env.ENCRYPTION_KEY,
    encryptionIv: process.env.ENCRYPTION_IV,
};
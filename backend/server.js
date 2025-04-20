// backend/server.js
require('dotenv').config(); // Load environment variables from .env file first
const http = require('http');
const app = require('./app'); // Import the configured Express app
const config = require('./config'); // Import merged configuration
const db = require('./config/database'); // Import database handler
const initializeWebSocketServer = require('./websocket/socketServer'); // Import WebSocket setup
// const logger = require('./utils/logger'); // Optional: Replace console with a proper logger like Winston

// --- Process-Level Error Handling ---
// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(`Error Name: ${err.name}, Message: ${err.message}`);
  // In a real app, log the error using a logger: logger.error('Unhandled Rejection', err);
  // Close server & exit process (optional, but recommended for stability)
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(`Error Name: ${err.name}, Message: ${err.message}`);
  // In a real app, log the error using a logger: logger.error('Uncaught Exception', err);
  // eslint-disable-next-line no-process-exit
  process.exit(1); // Mandatory exit after uncaught exception
});

// --- Server Initialization ---
const PORT = config.port || 5000; // Get port from config, default to 5000
const HOST = config.host || '0.0.0.0'; // Get host from config, default to allow external connections

// Create HTTP server using the Express app
const httpServer = http.createServer(app);

// Initialize WebSocket server and attach it to the HTTP server
initializeWebSocketServer(httpServer);
console.log('WebSocket server initialized.');
// logger.info('WebSocket server initialized.');

// --- Database Connection (already called in app.js, ensure it's handled there) ---
// If db.connect() wasn't called in app.js, you might call it here:
// db.connect().then(() => {
//   console.log('Database connected successfully.');
// }).catch(err => {
//   console.error('Database connection failed:', err);
//   process.exit(1);
// });

// --- Start Listening ---
const server = httpServer.listen(PORT, HOST, () => {
  console.log(`Server running in ${config.env || 'development'} mode on http://${HOST}:${PORT}`);
  // logger.info(`Server running in ${config.env || 'development'} mode on http://${HOST}:${PORT}`);
});

// --- Graceful Shutdown ---
const gracefulShutdown = (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);
  // logger.info(`${signal} signal received: closing HTTP server`);

  // Stop the server from accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
    // logger.info('HTTP server closed');

    // Close database connection (assuming db object has a disconnect method)
    if (db && typeof db.disconnect === 'function') {
      db.disconnect()
        .then(() => {
          console.log('Database connection closed');
          // logger.info('Database connection closed');
          // eslint-disable-next-line no-process-exit
          process.exit(0); // Exit cleanly
        })
        .catch(err => {
          console.error('Error closing database connection:', err);
          // logger.error('Error closing database connection:', err);
          // eslint-disable-next-line no-process-exit
          process.exit(1); // Exit with error
        });
    } else {
      console.log('No database disconnect method found, exiting.');
      // logger.warn('No database disconnect method found, exiting.');
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    }
  });

  // If server hasn't finished in reasonable time, force exit
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    // logger.error('Could not close connections in time, forcefully shutting down');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Standard signal for termination
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Signal for Ctrl+C
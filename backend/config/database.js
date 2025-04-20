// backend/config/database.js
const mongoose = require('mongoose');
const config = require('.'); // Loads config/index.js to get merged config

let connection = null; // To hold the connection instance

const connect = async () => {
    if (connection) {
        // console.log('MongoDB is already connected.');
        return connection;
    }

    if (!config.dbUri) {
        console.error('FATAL ERROR: MongoDB URI (dbUri) is not defined in the configuration.');
        process.exit(1);
    }

    try {
        console.log(`Attempting to connect to MongoDB at ${config.dbUri.split('@')[1] || config.dbUri}...`); // Hide credentials from log
        connection = await mongoose.connect(config.dbUri, {
            // Mongoose 6+ uses these defaults, but you can specify if needed:
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // For Mongoose 6+, createIndex is not needed:
            // useCreateIndex: true,
            // For Mongoose 6+, findAndModify is not needed:
            // useFindAndModify: false,
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        console.log('MongoDB Connected Successfully.');
        return connection;
    } catch (err) {
        console.error('MongoDB Connection Failed:');
        console.error(`Error Name: ${err.name}, Message: ${err.message}`);
        // Optional: Log the full error for debugging, but be careful in production
        // console.error(err);
        // Exit process on initial connection failure
        process.exit(1);
    }
};

const disconnect = async () => {
    if (connection) {
        try {
            await mongoose.disconnect();
            connection = null;
            console.log('MongoDB Disconnected.');
        } catch (err) {
            console.error('Error disconnecting MongoDB:', err);
            throw err; // Re-throw error for graceful shutdown handling
        }
    }
};

// --- Connection Events Handling (Optional but Recommended) ---
mongoose.connection.on('connected', () => {
    // console.log('Mongoose default connection open'); // Can be noisy
});

mongoose.connection.on('error', (err) => {
    console.error(`Mongoose default connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose default connection disconnected');
    // You might want to implement reconnection logic here for production scenarios
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', async () => {
    await disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await disconnect();
    process.exit(0);
});


module.exports = {
    connect,
    disconnect,
    // Optionally export the mongoose instance itself if needed elsewhere
    // mongooseInstance: mongoose
};
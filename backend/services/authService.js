// Fil: backend/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const config = require('../config'); // Ensure config/index.js is loaded

class AuthService {
    /**
     * Registrerer en ny bruker.
     * @param {string} name - Brukerens navn.
     * @param {string} email - Brukerens e-post.
     * @param {string} password - Brukerens passord.
     * @returns {Promise<User>} Den opprettede brukeren.
     * @throws {ErrorResponse} Hvis e-posten allerede er i bruk.
     */
    static async register(name, email, password) {
        // Sjekk om bruker finnes
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ErrorResponse('E-postadressen er allerede registrert', 400);
        }

        // Opprett bruker (passord hashing skjer via pre-save hook i User model)
        const user = await User.create({
            name,
            email,
            password
        });

        return user;
    }

    /**
     * Logger inn en bruker.
     * @param {string} email - Brukerens e-post.
     * @param {string} password - Brukerens passord.
     * @returns {Promise<User>} Brukerobjektet hvis innloggingen er vellykket.
     * @throws {ErrorResponse} Hvis e-post eller passord er feil.
     */
    static async login(email, password) {
        // Finn bruker og hent passordet
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            throw new ErrorResponse('Ugyldig e-post eller passord', 401);
        }

        // Sjekk passord
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            throw new ErrorResponse('Ugyldig e-post eller passord', 401);
        }

        // Fjern passord fra returnert objekt
        user.password = undefined;
        return user;
    }

    /**
     * Genererer en JWT for en bruker.
     * @param {User} user - Brukerobjektet.
     * @returns {string} JWT-token.
     */
    static generateToken(user) {
        return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
            expiresIn: config.jwtExpire
        });
        // Eller bruk metoden på User model: return user.getSignedJwtToken();
    }

     /**
     * Finner en bruker basert på ID.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<User|null>} Brukerobjektet eller null.
     */
    static async getUserById(userId) {
        const user = await User.findById(userId);
        return user;
    }

    // TODO: Legg til metoder for passordtilbakestilling, oppdatering etc.
    // static async forgotPassword(email) { ... }
    // static async resetPassword(token, newPassword) { ... }
    // static async updateUserDetails(userId, details) { ... }
    // static async updatePassword(userId, currentPassword, newPassword) { ... }
}

module.exports = AuthService;
// Fil: backend/services/exchangeService.js
const Exchange = require('../models/Exchange');
const ErrorResponse = require('../utils/errorResponse');
// const ccxt = require('ccxt'); // Eksempel på bibliotek for børs-API
// const cryptoUtils = require('../utils/cryptoUtils'); // Kryptering/dekryptering er i modellen
const config = require('../config');

class ExchangeService {
    /**
     * Henter alle børstilkoblinger for en gitt bruker.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Array<Exchange>>} En liste over børstilkoblinger (uten sensitive detaljer).
     */
    static async getExchangesForUser(userId) {
        // Ekskluder sensitive credentials som standard
        const exchanges = await Exchange.find({ user: userId }).select('-credentials.secretKey -credentials.passphrase -credentials.alertToken');
        return exchanges;
    }

    /**
     * Henter en spesifikk børstilkobling for en bruker.
     * @param {string} exchangeId - ID for børstilkoblingen.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Exchange|null>} Børstilkoblingen (uten sensitive detaljer) eller null.
     * @throws {ErrorResponse} Hvis tilkoblingen ikke finnes eller ikke tilhører brukeren.
     */
    static async getExchangeById(exchangeId, userId) {
        const exchange = await Exchange.findOne({ _id: exchangeId, user: userId }).select('-credentials.secretKey -credentials.passphrase -credentials.alertToken');
        if (!exchange) {
            throw new ErrorResponse('Børstilkobling ikke funnet', 404);
        }
        return exchange;
    }

    /**
     * Oppretter en ny børstilkobling.
     * @param {object} exchangeData - Data for den nye tilkoblingen (inkl. name, exchange, credentials).
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Exchange>} Den opprettede børstilkoblingen (uten sensitive detaljer).
     */
    static async createExchangeConnection(exchangeData, userId) {
        if (!config.encryptionKey || !config.encryptionIv) {
            throw new ErrorResponse('Krypteringsnøkler er ikke konfigurert på serveren. Kan ikke lagre API-nøkler sikkert.', 500);
        }
        const newExchange = await Exchange.create({
            ...exchangeData,
            user: userId
        });
        // Returner objekt uten sensitive felt
        const safeExchange = { ...newExchange.toObject() };
        if (safeExchange.credentials) {
            delete safeExchange.credentials.secretKey;
            delete safeExchange.credentials.passphrase;
            delete safeExchange.credentials.alertToken;
        }
        return safeExchange;
    }

     /**
     * Oppdaterer en eksisterende børstilkobling.
     * @param {string} exchangeId - ID for tilkoblingen som skal oppdateres.
     * @param {object} updateData - Data som skal oppdateres.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Exchange>} Den oppdaterte børstilkoblingen (uten sensitive detaljer).
     * @throws {ErrorResponse} Hvis tilkoblingen ikke finnes eller ikke tilhører brukeren.
     */
    static async updateExchangeConnection(exchangeId, updateData, userId) {
         const exchange = await Exchange.findOne({ _id: exchangeId, user: userId });
         if (!exchange) {
             throw new ErrorResponse('Børstilkobling ikke funnet', 404);
         }

         // Oppdater felter
         if (updateData.name) exchange.name = updateData.name;
         if (updateData.exchange) exchange.exchange = updateData.exchange; // Vær forsiktig med å endre børs type
         if (updateData.isActive !== undefined) exchange.isActive = updateData.isActive;

         // Oppdater credentials KUN hvis nye er oppgitt
         if (updateData.credentials) {
            if (updateData.credentials.apiKey) exchange.credentials.apiKey = updateData.credentials.apiKey;
            if (updateData.credentials.secretKey) exchange.credentials.secretKey = updateData.credentials.secretKey;
            if (updateData.credentials.passphrase) exchange.credentials.passphrase = updateData.credentials.passphrase;
            if (updateData.credentials.subaccount !== undefined) exchange.credentials.subaccount = updateData.credentials.subaccount;
            if (updateData.credentials.isPaper !== undefined) exchange.credentials.isPaper = updateData.credentials.isPaper;
         }

         await exchange.save();

        // Returner objekt uten sensitive felt
        const safeExchange = { ...exchange.toObject() };
        if (safeExchange.credentials) {
            delete safeExchange.credentials.secretKey;
            delete safeExchange.credentials.passphrase;
            delete safeExchange.credentials.alertToken;
        }
        return safeExchange;
    }

    /**
     * Sletter en børstilkobling.
     * @param {string} exchangeId - ID for tilkoblingen som skal slettes.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<void>}
     * @throws {ErrorResponse} Hvis tilkoblingen ikke finnes eller ikke tilhører brukeren.
     */
    static async deleteExchangeConnection(exchangeId, userId) {
        const exchange = await Exchange.findOne({ _id: exchangeId, user: userId });
        if (!exchange) {
            throw new ErrorResponse('Børstilkobling ikke funnet', 404);
        }
        await exchange.deleteOne(); // Eller exchange.remove() avhengig av Mongoose versjon
    }

    /**
     * Tester en børstilkobling.
     * @param {object} connectionData - Data for tilkoblingen som skal testes (enten lagret ID eller direkte credentials).
     * @param {string} userId - Brukerens ID (hvis ID brukes for å hente lagrede credentials).
     * @returns {Promise<{success: boolean, message: string, data?: any}>} Resultatet av testen.
     */
    static async testConnection(connectionData, userId) {
        let credentials;
        let exchangeType = connectionData.exchange; // Antar at børsnavn er i connectionData hvis credentials gis direkte

        if (connectionData.exchangeId) {
            // Hent lagrede credentials hvis ID er oppgitt
            const exchange = await Exchange.findOne({ _id: connectionData.exchangeId, user: userId });
            if (!exchange) {
                return { success: false, message: 'Lagret tilkobling ikke funnet.' };
            }
            credentials = exchange.getDecryptedCredentials(); // Hent dekrypterte nøkler
            exchangeType = exchange.exchange; // Bruk lagret børsnavn
        } else if (connectionData.credentials) {
            // Bruk credentials direkte fra input
            credentials = connectionData.credentials;
        } else {
            return { success: false, message: 'Mangler credentials eller ID for testing.' };
        }

        if (!exchangeType) {
             return { success: false, message: 'Ukjent børs type.' };
        }

        console.log(`[ExchangeService] Tester tilkobling for børs: ${exchangeType}`);
        // TODO: Implementer faktisk API-kall for å teste tilkoblingen
        // Bruk et bibliotek som ccxt eller børsens egen SDK
        // Eksempel (pseudo-kode med ccxt):
        /*
        try {
            const exchangeClass = ccxt[exchangeType];
            if (!exchangeClass) {
                return { success: false, message: `Børsen '${exchangeType}' støttes ikke for øyeblikket.` };
            }

            const exchangeInstance = new exchangeClass({
                apiKey: credentials.apiKey,
                secret: credentials.secretKey,
                password: credentials.passphrase, // For børser som krever det
                // enableRateLimit: true, // Anbefalt
                // Andre options...
            });

             // Forsøk et enkelt, skrivebeskyttet kall, f.eks. hente saldo
            const balance = await exchangeInstance.fetchBalance();
            console.log(`[ExchangeService] Test vellykket for ${exchangeType}. Saldo mottatt.`);

             // Oppdater status på lagret tilkobling hvis ID ble brukt
             if (connectionData.exchangeId) {
                 await Exchange.updateOne(
                     { _id: connectionData.exchangeId, user: userId },
                     { connectionStatus: 'ok', lastTested: new Date(), errorMessage: null }
                 );
             }

             return { success: true, message: 'Tilkobling vellykket!', data: { /* Kan inkludere noe balanseinfo her * / } };

        } catch (error) {
            console.error(`[ExchangeService] Test feilet for ${exchangeType}:`, error.message);
             const errorMessage = `Tilkobling feilet: ${error.constructor.name} - ${error.message.substring(0, 100)}...`; // Kutt ned lange feilmeldinger
             // Oppdater status på lagret tilkobling hvis ID ble brukt
             if (connectionData.exchangeId) {
                  await Exchange.updateOne(
                     { _id: connectionData.exchangeId, user: userId },
                     { connectionStatus: 'failed', lastTested: new Date(), errorMessage: errorMessage }
                 );
             }
             return { success: false, message: errorMessage };
        }
        */

        // Placeholder response
        await new Promise(resolve => setTimeout(resolve, 500)); // Simuler nettverksforsinkelse
        const success = Math.random() > 0.3; // Simuler suksess/feil
        if (success) {
             if (connectionData.exchangeId) {
                 await Exchange.updateOne(
                     { _id: connectionData.exchangeId, user: userId },
                     { connectionStatus: 'ok', lastTested: new Date(), errorMessage: null }
                 );
             }
            return { success: true, message: `Simulert test OK for ${exchangeType}` };
        } else {
            const errorMessage = `Simulert test FEIL for ${exchangeType}`;
             if (connectionData.exchangeId) {
                 await Exchange.updateOne(
                     { _id: connectionData.exchangeId, user: userId },
                     { connectionStatus: 'failed', lastTested: new Date(), errorMessage: errorMessage }
                 );
             }
            return { success: false, message: errorMessage };
        }
    }

     /**
     * Henter dekrypterte credentials for en gitt exchange ID og bruker ID.
     * BRUK MED FORSIKTIGHET! Kun når det er nødvendig for API-kall.
     * @param {string} exchangeId - ID for børstilkoblingen.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Object|null>} Et objekt med dekrypterte credentials eller null.
     * @throws {ErrorResponse} Hvis tilkoblingen ikke finnes eller ikke tilhører brukeren.
     */
    static async getDecryptedCredentials(exchangeId, userId) {
        const exchange = await Exchange.findOne({ _id: exchangeId, user: userId });
        if (!exchange) {
            throw new ErrorResponse('Børstilkobling ikke funnet', 404);
        }
        return exchange.getDecryptedCredentials();
    }
}

module.exports = ExchangeService;
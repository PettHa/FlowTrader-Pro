// Fil: backend/services/strategyService.js
const Strategy = require('../models/Strategy');
const ErrorResponse = require('../utils/errorResponse');

class StrategyService {
    /**
     * Henter alle strategier for en gitt bruker.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Array<Strategy>>} En liste over brukerens strategier.
     */
    static async getStrategiesForUser(userId) {
        const strategies = await Strategy.find({ user: userId }).sort({ updatedAt: -1 });
        return strategies;
    }

    /**
     * Henter en spesifikk strategi for en bruker.
     * @param {string} strategyId - Strategiens ID.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Strategy|null>} Strategien eller null hvis den ikke finnes/tilhører brukeren.
     * @throws {ErrorResponse} Hvis strategien ikke finnes eller ikke tilhører brukeren.
     */
    static async getStrategyById(strategyId, userId) {
        const strategy = await Strategy.findOne({ _id: strategyId, user: userId });
        if (!strategy) {
            throw new ErrorResponse('Strategi ikke funnet', 404);
        }
        return strategy;
    }

    /**
     * Oppretter en ny strategi.
     * @param {object} strategyData - Data for den nye strategien (inkl. name, description, flowData).
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Strategy>} Den opprettede strategien.
     */
    static async createStrategy(strategyData, userId) {
        const newStrategy = await Strategy.create({
            ...strategyData,
            user: userId
        });
        return newStrategy;
    }

    /**
     * Oppdaterer en eksisterende strategi.
     * @param {string} strategyId - ID for strategien som skal oppdateres.
     * @param {object} updateData - Data som skal oppdateres (f.eks. name, description, flowData, isActive).
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Strategy>} Den oppdaterte strategien.
     * @throws {ErrorResponse} Hvis strategien ikke finnes eller ikke tilhører brukeren.
     */
    static async updateStrategy(strategyId, updateData, userId) {
        const strategy = await Strategy.findOne({ _id: strategyId, user: userId });
        if (!strategy) {
            throw new ErrorResponse('Strategi ikke funnet', 404);
        }

        // Oppdater felter
        if (updateData.name) strategy.name = updateData.name;
        if (updateData.description !== undefined) strategy.description = updateData.description;
        if (updateData.flowData) strategy.flowData = updateData.flowData;
        if (updateData.isActive !== undefined) strategy.isActive = updateData.isActive;
        if (updateData.markets) strategy.markets = updateData.markets;
        if (updateData.parameters) strategy.parameters = updateData.parameters;

        await strategy.save();
        return strategy;
    }

    /**
     * Sletter en strategi.
     * @param {string} strategyId - ID for strategien som skal slettes.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<void>}
     * @throws {ErrorResponse} Hvis strategien ikke finnes eller ikke tilhører brukeren.
     */
    static async deleteStrategy(strategyId, userId) {
        const strategy = await Strategy.findOne({ _id: strategyId, user: userId });
        if (!strategy) {
            throw new ErrorResponse('Strategi ikke funnet', 404);
        }
        // TODO: Vurder å slette relaterte backtests/trades også? Eller beholde for historikk?
        await strategy.deleteOne(); // Eller strategy.remove()
    }

     /**
     * Aktiverer en strategi for live trading.
     * @param {string} strategyId - ID for strategien som skal aktiveres.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Strategy>} Den aktiverte strategien.
     */
    static async activateStrategy(strategyId, userId) {
        // Her vil du kanskje trigge TradingService for å starte lytting/kjøring
        console.log(`[StrategyService] Aktiverer strategi ${strategyId} for bruker ${userId}`);
        return this.updateStrategy(strategyId, { isActive: true }, userId);
    }

     /**
     * Deaktiverer en strategi for live trading.
     * @param {string} strategyId - ID for strategien som skal deaktiveres.
     * @param {string} userId - Brukerens ID.
     * @returns {Promise<Strategy>} Den deaktiverte strategien.
     */
    static async deactivateStrategy(strategyId, userId) {
        // Her vil du kanskje trigge TradingService for å stoppe lytting/kjøring
         console.log(`[StrategyService] Deaktiverer strategi ${strategyId} for bruker ${userId}`);
        return this.updateStrategy(strategyId, { isActive: false }, userId);
    }
}

module.exports = StrategyService;
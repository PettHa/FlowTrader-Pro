// backend/services/marketDataService.js
const ccxt = require('ccxt');
const MarketDataCache = require('../models/MarketDataCache'); // Importer den nye modellen
const ErrorResponse = require('../utils/errorResponse');
// const ExchangeService = require('./exchangeService'); // Kan trenges for private APIer/høyere limits

class MarketDataService {

    /**
     * Henter historiske OHLCV-data for et symbol, med database caching.
     * @param {string} exchangeId - ID for børsen (ccxt format, f.eks. 'binance').
     * @param {string} symbol - Handelsparet (f.eks. 'BTC/USDT').
     * @param {string} timeframe - Tidsrammen (f.eks. '1h', '1d').
     * @param {Date} startDate - Startdato for dataene.
     * @param {Date} endDate - Sluttdato for dataene.
     * @returns {Promise<Array<object>>} En liste med OHLCV-data.
     * @throws {ErrorResponse} Hvis data ikke kan hentes.
     */
    static async getHistoricalData(exchangeId, symbol, timeframe, startDate, endDate) {
        console.log(`[MarketDataService] Forespørsel: ${exchangeId}:${symbol} (${timeframe}) fra ${startDate.toISOString()} til ${endDate.toISOString()}`);

        // --- 1. Sjekk Cache ---
        try {
            const cachedData = await MarketDataCache.find({
                exchange: exchangeId,
                symbol: symbol,
                timeframe: timeframe,
                timestamp: { $gte: startDate, $lte: endDate }
            }).sort({ timestamp: 'asc' }).lean(); // .lean() for performance

            // Enkel sjekk: Hvis vi har *noen* data i cache, antar vi den er komplett for nå.
            // TODO: Implementer mer robust sjekk for fullstendighet (se kommentarer)
            if (cachedData && cachedData.length > 0) {
                 // Sjekk om start- og sluttdato i cache matcher forespørsel (omtrentlig)
                 const cacheStartTime = cachedData[0].timestamp.getTime();
                 const cacheEndTime = cachedData[cachedData.length - 1].timestamp.getTime();
                 const requestedStartTime = startDate.getTime();
                 const timeframeMillis = this.timeframeToMillis(timeframe);

                 // Aksepter hvis starttiden i cache er innenfor én timeframe av forespurt start
                 // og slutttiden er etter forespurt slutt (eller svært nær)
                 if (Math.abs(cacheStartTime - requestedStartTime) <= timeframeMillis && cacheEndTime >= endDate.getTime() - timeframeMillis) {
                     console.log(`[MarketDataService] Cache HIT for ${exchangeId}:${symbol} (${timeframe}). Returnerer ${cachedData.length} barer.`);
                     // Formater litt for konsistens (selv om lean() fjerner Mongoose-ting)
                     return cachedData.map(d => ({
                        timestamp: d.timestamp,
                        open: d.open,
                        high: d.high,
                        low: d.low,
                        close: d.close,
                        volume: d.volume,
                        exchange: d.exchange,
                        symbol: d.symbol,
                        timeframe: d.timeframe
                     }));
                 } else {
                    console.log(`[MarketDataService] Cache PARTIAL/MISMATCH for ${exchangeId}:${symbol}. Start: ${new Date(cacheStartTime)}, End: ${new Date(cacheEndTime)}`);
                    // Gå videre for å hente fra API (enkel implementering)
                 }
            } else {
                 console.log(`[MarketDataService] Cache MISS for ${exchangeId}:${symbol} (${timeframe})`);
            }
        } catch (cacheError) {
            console.error(`[MarketDataService] Feil ved sjekking av cache for ${exchangeId}:${symbol}:`, cacheError);
            // Fortsett til API-henting ved cache-feil
        }


        // --- 2. Hent fra API (hvis cache miss/partial) ---
        console.log(`[MarketDataService] Henter fra API: ${exchangeId}:${symbol} (${timeframe})`);
        let fetchedData = [];
        try {
            const exchangeClass = ccxt[exchangeId];
            if (!exchangeClass) {
                throw new ErrorResponse(`Børsen '${exchangeId}' støttes ikke av ccxt`, 400);
            }

            const exchangeInstance = new exchangeClass({ enableRateLimit: true });

            if (!exchangeInstance.has['fetchOHLCV']) {
                throw new ErrorResponse(`Børsen '${exchangeId}' støtter ikke fetchOHLCV`, 400);
            }

            const limit = 1000; // Max bars per request (kan variere)
            let currentTimestamp = startDate.getTime();
            const endTimestamp = endDate.getTime();
            const timeframeMillis = exchangeInstance.parseTimeframe(timeframe) * 1000; // Millisekunder per bar

            while (currentTimestamp <= endTimestamp) {
                console.log(`[MarketDataService] fetchOHLCV fra ${new Date(currentTimestamp).toISOString()}`);
                const ohlcv = await exchangeInstance.fetchOHLCV(symbol, timeframe, currentTimestamp, limit);

                if (ohlcv.length === 0) {
                    console.log('[MarketDataService] Ingen mer data mottatt fra børsen.');
                    break; // Ingen mer data tilgjengelig
                }

                 // Legg til data som er innenfor det opprinnelige tidsvinduet
                 const newBars = ohlcv
                     .filter(bar => bar[0] >= startDate.getTime() && bar[0] <= endTimestamp)
                     .map(bar => ({
                         timestamp: new Date(bar[0]),
                         open: bar[1],
                         high: bar[2],
                         low: bar[3],
                         close: bar[4],
                         volume: bar[5],
                         exchange: exchangeId,
                         symbol: symbol,
                         timeframe: timeframe
                     }));

                 fetchedData = fetchedData.concat(newBars);

                // Gå til neste tidsstempel. Siste bar + 1 timeframe.
                currentTimestamp = ohlcv[ohlcv.length - 1][0] + timeframeMillis;

                 // Sikkerhetssjekk for å unngå uendelig løkke hvis timestamp ikke øker
                 if (currentTimestamp <= ohlcv[ohlcv.length - 1][0]) {
                     console.warn('[MarketDataService] Timestamp økte ikke, avslutter henting for å unngå løkke.');
                     break;
                 }

                // Pause for å respektere rate limits
                await exchangeInstance.sleep(exchangeInstance.rateLimit || 100); // Default til 100ms hvis rateLimit ikke er satt
            }

             // Fjern duplikater basert på timestamp (kan skje ved overlapp)
             const uniqueData = Array.from(new Map(fetchedData.map(item => [item.timestamp.getTime(), item])).values());
             fetchedData = uniqueData.sort((a, b) => a.timestamp - b.timestamp); // Sorter etter tid

             console.log(`[MarketDataService] Hentet ${fetchedData.length} unike barer fra API for ${exchangeId}:${symbol}.`);

             // --- 3. Lagre i Cache ---
             if (fetchedData.length > 0) {
                 try {
                     const cacheEntries = fetchedData.map(bar => ({
                         exchange: bar.exchange,
                         symbol: bar.symbol,
                         timeframe: bar.timeframe,
                         timestamp: bar.timestamp,
                         open: bar.open,
                         high: bar.high,
                         low: bar.low,
                         close: bar.close,
                         volume: bar.volume
                         // createdAt blir satt av default/TTL index
                     }));

                     // Bruk updateOne med upsert for å unngå unique index feil ved overlapping
                     const bulkOps = cacheEntries.map(entry => ({
                         updateOne: {
                             filter: {
                                 exchange: entry.exchange,
                                 symbol: entry.symbol,
                                 timeframe: entry.timeframe,
                                 timestamp: entry.timestamp
                             },
                             update: { $set: entry }, // Oppdater hvis finnes
                             upsert: true // Sett inn hvis ikke finnes
                         }
                     }));

                     if (bulkOps.length > 0) {
                         const result = await MarketDataCache.bulkWrite(bulkOps);
                         console.log(`[MarketDataService] Cache oppdatert. Inserted: ${result.upsertedCount}, Matched: ${result.matchedCount}`);
                     }

                 } catch (saveError) {
                     // Logg feil, men ikke stopp prosessen - returner data uansett
                     console.error(`[MarketDataService] Feil ved lagring til cache for ${exchangeId}:${symbol}:`, saveError.code === 11000 ? 'Duplicate key error (ignorable)' : saveError.message);
                 }
             }

            // --- 4. Returner Hentet Data ---
            return fetchedData;

        } catch (error) {
            // Håndter ccxt-spesifikke feil om mulig
            if (error instanceof ccxt.NetworkError) {
                 console.error(`[MarketDataService] Nettverksfeil for ${exchangeId}:`, error.message);
                 throw new ErrorResponse(`Nettverksfeil ved kommunikasjon med ${exchangeId}`, 503); // Service Unavailable
            } else if (error instanceof ccxt.ExchangeError) {
                 console.error(`[MarketDataService] Børsfeil for ${exchangeId}:`, error.message);
                 // Sjekk for vanlige feil som "Invalid symbol"
                 if (error.message.toLowerCase().includes('symbol')) {
                    throw new ErrorResponse(`Ugyldig symbol '${symbol}' for ${exchangeId}`, 400);
                 }
                 throw new ErrorResponse(`Feil fra børsen ${exchangeId}: ${error.message}`, 502); // Bad Gateway
            } else if (error instanceof ErrorResponse) {
                // Re-throw kjente feil
                throw error;
            }
            // Generell feil
            console.error(`[MarketDataService] Generell feil ved henting av data for ${exchangeId}:${symbol}:`, error);
            throw new ErrorResponse(`Kunne ikke hente data for ${symbol}: ${error.message}`, 500);
        }
    } // Slutt på getHistoricalData

    // Behold timeframeToMillis og andre hjelpefunksjoner...
    static timeframeToMillis(timeframe) {
        const unit = timeframe.slice(-1);
        const value = parseInt(timeframe.slice(0, -1));
        switch (unit) {
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'w': return value * 7 * 24 * 60 * 60 * 1000;
            case 'M': return value * 30 * 24 * 60 * 60 * 1000; // Approx
            default: return 60 * 1000; // Default 1 min
        }
    }

    // Behold getAvailableSymbols og getAvailableTimeframes (de kan også bruke ccxt)
    static async getAvailableSymbols(exchangeId) {
        console.log(`[MarketDataService] Henter symboler for ${exchangeId}`);
        try {
            const exchangeClass = ccxt[exchangeId];
            if (!exchangeClass) throw new ErrorResponse(`Børsen '${exchangeId}' støttes ikke`, 400);
            const exchangeInstance = new exchangeClass();
            await exchangeInstance.loadMarkets();
            const symbols = Object.keys(exchangeInstance.markets);
            return symbols.sort();
        } catch (error) {
            console.error(`[MarketDataService] Feil ved henting av symboler for ${exchangeId}:`, error);
            throw new ErrorResponse(`Kunne ikke hente symboler: ${error.message}`, 500);
        }
    }

    static async getAvailableTimeframes(exchangeId) {
         console.log(`[MarketDataService] Henter tidsrammer for ${exchangeId}`);
         try {
             const exchangeClass = ccxt[exchangeId];
             if (!exchangeClass) throw new ErrorResponse(`Børsen '${exchangeId}' støttes ikke`, 400);
             const exchangeInstance = new exchangeClass();
             if (exchangeInstance.timeframes) {
                  return Object.keys(exchangeInstance.timeframes);
             } else {
                  console.warn(`[MarketDataService] Børsen ${exchangeId} spesifiserer ikke timeframes, returnerer standard liste.`);
                  // Returner vanlige timeframes hvis børsen ikke oppgir dem
                  return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
             }
         } catch (error) {
              console.error(`[MarketDataService] Feil ved henting av tidsrammer for ${exchangeId}:`, error);
             throw new ErrorResponse(`Kunne ikke hente tidsrammer: ${error.message}`, 500);
         }
     }

} // Slutt på klassen

module.exports = MarketDataService;
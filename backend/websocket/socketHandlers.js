// backend/websocket/socketHandlers.js

/**
 * Placeholder for WebSocket meldingshåndtering.
 * Denne modulen vil inneholde logikken for å håndtere ulike typer
 * meldinger mottatt fra WebSocket-klienter.
 */
class SocketHandlers {
    /**
     * Håndterer en innkommende melding fra en klient.
     * @param {WebSocket} ws - WebSocket-tilkoblingen for klienten.
     * @param {object} message - Den parsede meldingen fra klienten.
     * @param {WebSocket.Server} wss - WebSocket-serverinstansen (for kringkasting etc.).
     */
    static handleMessage(ws, message, wss) {
      console.log('[SocketHandlers] Behandler melding:', message);
  
      // TODO: Implementer logikk basert på message.type
      switch (message?.type) { // Bruk optional chaining for sikkerhet
        case 'subscribe':
          // Logikk for å abonnere på data (f.eks. markedsdata, strategi-status)
          // const topic = message.payload?.topic;
          // if (topic) { subscribeClientToTopic(ws, topic); }
          ws.send(JSON.stringify({ type: 'info', message: `Abonnement på ${message.payload?.topic || 'ukjent'} mottatt (ikke implementert).` }));
          break;
        case 'unsubscribe':
          // Logikk for å avslutte abonnement
          // const topic = message.payload?.topic;
          // if (topic) { unsubscribeClientFromTopic(ws, topic); }
          ws.send(JSON.stringify({ type: 'info', message: `Avmelding fra ${message.payload?.topic || 'ukjent'} mottatt (ikke implementert).` }));
          break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        // Andre meldingstyper...
        default:
          console.warn(`[SocketHandlers] Ukjent eller manglende meldingstype: ${message?.type}`);
          ws.send(JSON.stringify({ type: 'error', message: `Ukjent eller manglende meldingstype mottatt.` }));
      }
    }
  
    /**
     * Håndterer når en klient kobler fra.
     * @param {WebSocket} ws - WebSocket-tilkoblingen som ble lukket.
     * @param {WebSocket.Server} wss - WebSocket-serverinstansen.
     */
    static handleDisconnect(ws, wss) {
      console.log('[SocketHandlers] Klient koblet fra.');
      // TODO: Rydd opp eventuelle abonnementer eller ressurser knyttet til klienten
      // f.eks., fjern fra lister over abonnenter
      // unsubscribeClientFromAll(ws);
    }
  
     /**
     * Håndterer en feil på en klienttilkobling.
     * @param {WebSocket} ws - WebSocket-tilkoblingen der feilen oppstod.
     * @param {Error} error - Feilobjektet.
     * @param {WebSocket.Server} wss - WebSocket-serverinstansen.
     */
    static handleError(ws, error, wss) {
         console.error('[SocketHandlers] Feil på klienttilkobling:', error.message);
         // Ingen grunn til å sende feil tilbake her, siden tilkoblingen kan være brutt.
         // Forsøk å lukke tilkoblingen på en ryddig måte hvis den fortsatt er åpen.
         if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
             ws.terminate();
         }
    }
  }
  
  module.exports = SocketHandlers;
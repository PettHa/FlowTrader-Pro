// backend/websocket/socketServer.js
const WebSocket = require('ws'); // Importer ws-biblioteket
const socketHandlers = require('./socketHandlers'); // Antar at denne filen vil inneholde logikk for meldingshåndtering

/**
 * Initialiserer WebSocket-serveren og kobler den til HTTP-serveren.
 * @param {http.Server} httpServer - Den eksisterende HTTP-serveren.
 */
const initializeWebSocketServer = (httpServer) => {
  // Opprett en ny WebSocket-server som lytter på samme port som HTTP-serveren
  const wss = new WebSocket.Server({ server: httpServer });

  console.log('[WebSocket] Server lytter...');

  // Event listener for nye tilkoblinger
  wss.on('connection', (ws, req) => {
    // req inneholder informasjon om den innkommende forespørselen (f.eks. for autentisering)
    const clientIp = req.socket.remoteAddress;
    console.log(`[WebSocket] Klient koblet til fra ${clientIp}`);

    // Send en velkomstmelding
    ws.send(JSON.stringify({ type: 'info', message: 'Velkommen til FlowTrader WebSocket!' }));

    // Håndter meldinger fra klienten
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        console.log('[WebSocket] Mottatt melding:', parsedMessage);

        // Send meldingen til håndteringslogikken
        // Bruk try/catch rundt kall til ekstern handler
        try {
             socketHandlers.handleMessage(ws, parsedMessage, wss);
        } catch (handlerError) {
             console.error('[WebSocket] Feil i socketHandler.handleMessage:', handlerError);
             // Ikke send feil tilbake til klienten her nødvendigvis, logg internt.
        }

      } catch (error) {
        console.error('[WebSocket] Kunne ikke parse melding:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Ugyldig JSON-format mottatt.' }));
      }
    });

    // Håndter lukking av tilkobling
    ws.on('close', (code, reason) => {
      console.log(`[WebSocket] Klient koblet fra. Kode: ${code}, Årsak: ${reason ? reason.toString() : 'Ingen årsak oppgitt'}`);
      try {
          socketHandlers.handleDisconnect(ws, wss);
      } catch (handlerError) {
          console.error('[WebSocket] Feil i socketHandler.handleDisconnect:', handlerError);
      }
    });

    // Håndter feil på tilkoblingen
    ws.on('error', (error) => {
      console.error('[WebSocket] Tilkoblingsfeil:', error);
       try {
           socketHandlers.handleError(ws, error, wss);
       } catch (handlerError) {
           console.error('[WebSocket] Feil i socketHandler.handleError:', handlerError);
       }
    });
  });

  // Event listener for serverfeil
  wss.on('error', (error) => {
    console.error('[WebSocket] Serverfeil:', error);
  });

  // Funksjon for å kringkaste meldinger til alle tilkoblede klienter (kan være nyttig)
  wss.broadcast = (data) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
            client.send(message);
        } catch (sendError) {
            console.error("[WebSocket] Feil ved sending til klient:", sendError);
        }
      }
    });
  };

  // Gjør wss-instansen tilgjengelig hvis nødvendig (f.eks. for å sende meldinger fra andre deler av appen)
  // app.set('wss', wss); // Hvis du bruker app.set/get
  // module.exports.wss = wss; // Alternativ måte å eksportere på

}; // Slutt på initializeWebSocketServer funksjonen

// Eksporter funksjonen slik at server.js kan kalle den
module.exports = initializeWebSocketServer;
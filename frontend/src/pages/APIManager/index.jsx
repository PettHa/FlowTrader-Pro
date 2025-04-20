import React, { useEffect, useState } from 'react';
import { Shield, HelpCircle } from 'lucide-react';

// Components
import APIManager from '../../components/exchanges/APIManager';
// Vi kan lage flere komponenter senere, for eksempel ExchangeCard, TestConnection, etc.

// API calls
import { getExchanges } from '../../api/exchangeApi';

// Styles
import './styles.css';

const APIManagerPage = () => {
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        setLoading(true);
        const response = await getExchanges();
        setExchanges(response.data);
        setError(null);
      } catch (err) {
        console.error('Feil ved henting av børstilkoblinger:', err);
        setError('Kunne ikke laste børstilkoblinger. Vennligst prøv igjen.');
      } finally {
        setLoading(false);
      }
    };

    fetchExchanges();
  }, []);

  const handleExchangeAdded = (newExchange) => {
    setExchanges(prev => [...prev, newExchange]);
  };

  const handleExchangeRemoved = (exchangeId) => {
    setExchanges(prev => prev.filter(ex => ex._id !== exchangeId));
  };

  const handleExchangeUpdated = (updatedExchange) => {
    setExchanges(prev => 
      prev.map(ex => ex._id === updatedExchange._id ? updatedExchange : ex)
    );
  };

  return (
    <div className="api-manager-page">
      <div className="page-header">
        <h1 className="page-title">API-Tilkoblinger</h1>
      </div>
      
      <div className="security-notice">
        <Shield size={20} />
        <div className="security-text">
          <h3>Sikkerhetsinformasjon</h3>
          <p>
            Alle API-nøkler krypteres sikkert på serveren og kan ikke ses av andre brukere eller 
            Flowtrader-teamet. For økt sikkerhet, opprett API-nøkler med begrenset tilgang når 
            det er mulig, og bruk unike nøkler for hver plattform.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">Laster børstilkoblinger...</div>
      ) : error ? (
        <div className="error-container">{error}</div>
      ) : (
        <div className="api-manager-container">
          <APIManager 
            initialExchanges={exchanges}
            onExchangeAdded={handleExchangeAdded}
            onExchangeRemoved={handleExchangeRemoved}
            onExchangeUpdated={handleExchangeUpdated}
          />
        </div>
      )}

      <div className="help-section">
        <div className="help-header">
          <HelpCircle size={18} />
          <h3>Trenger du hjelp?</h3>
        </div>
        <div className="help-content">
          <p>
            For å koble FlowTrader til børser og meglere, trenger du å opprette API-nøkler
            fra din børs- eller meglerkonto. Disse nøklene lar FlowTrader kommunisere med
            plattformen på dine vegne.
          </p>
          
          <div className="help-links">
            <h4>Veiledninger for API-oppsett:</h4>
            <ul>
              <li><a href="https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072" target="_blank" rel="noopener noreferrer">Binance API-guide</a></li>
              <li><a href="https://help.coinbase.com/en/exchange/managing-my-account/how-to-create-an-api-key" target="_blank" rel="noopener noreferrer">Coinbase Pro API-guide</a></li>
              <li><a href="https://alpaca.markets/docs/api-references/trading-api/" target="_blank" rel="noopener noreferrer">Alpaca API-guide</a></li>
              <li><a href="https://www.tradingview.com/support/solutions/43000529348-webhooks/" target="_blank" rel="noopener noreferrer">TradingView Webhooks Guide</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIManagerPage;
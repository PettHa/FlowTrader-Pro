import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, AlertTriangle } from 'lucide-react';

// Components
import LiveTradingPanel from '../../components/trading/LiveTradingPanel';
// Vi kan lage flere komponenter senere for detaljert vising

// API calls
import { getStrategy } from '../../api/strategyApi';
import { getActiveTrades, getOpenOrders, startStrategy, stopStrategy } from '../../api/tradingApi';
import { getExchanges } from '../../api/exchangeApi';

// Styles
import './styles.css';

const LiveTradingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [strategy, setStrategy] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [trades, setTrades] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hent strategi og data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Hent strategi
        const strategyResponse = await getStrategy(id);
        setStrategy(strategyResponse.data);
        
        // Sjekk om strategien er aktiv
        setIsActive(strategyResponse.data.isActive || false);
        
        // Hent børstilkoblinger
        const exchangesResponse = await getExchanges();
        setExchanges(exchangesResponse.data);
        
        // Sett standard børs hvis noen er tilgjengelige
        if (exchangesResponse.data.length > 0) {
          setSelectedExchange(exchangesResponse.data[0]._id);
        }
        
        // Hent aktive trades
        const tradesResponse = await getActiveTrades();
        setTrades(tradesResponse.data);
        
        // Hent åpne ordrer
        const ordersResponse = await getOpenOrders();
        setOrders(ordersResponse.data);
        
        setError(null);
      } catch (err) {
        console.error('Feil ved henting av data:', err);
        setError('Kunne ikke laste strategien eller trading-data.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Start/stopp trading
  const handleToggleTrading = async () => {
    try {
      if (isActive) {
        // Stopp trading
        await stopStrategy(id);
        setIsActive(false);
      } else {
        // Start trading
        if (!selectedExchange) {
          setError('Vennligst velg en børs før du starter trading.');
          return;
        }
        
        await startStrategy(id, { exchangeId: selectedExchange });
        setIsActive(true);
      }
    } catch (err) {
      console.error('Feil ved start/stopp av trading:', err);
      setError(`Kunne ikke ${isActive ? 'stoppe' : 'starte'} trading.`);
    }
  };

  // Endre valgt børs
  const handleExchangeChange = (exchangeId) => {
    setSelectedExchange(exchangeId);
  };

  // Naviger til backtest
  const handleGoToBacktest = () => {
    navigate(`/strategy/${id}/backtest`);
  };

  // Naviger tilbake
  const handleGoBack = () => {
    navigate(`/strategy/${id}`);
  };

  if (loading) {
    return <div className="loading-container">Laster strategi...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={handleGoBack}>
          Tilbake til strategi
        </button>
      </div>
    );
  }

  return (
    <div className="live-trading-page">
      <div className="page-header">
        <button className="btn btn-icon" onClick={handleGoBack}>
          <ArrowLeft size={16} />
          <span>Tilbake</span>
        </button>
        
        <h1 className="page-title">
          {strategy ? `Live Trading: ${strategy.name}` : 'Live Trading'}
        </h1>
        
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleGoToBacktest}
          >
            <BarChart2 size={16} />
            <span>Til Backtest</span>
          </button>
        </div>
      </div>
      
      {exchanges.length === 0 ? (
        <div className="no-exchanges-warning">
          <AlertTriangle size={20} />
          <div>
            <h3>Ingen børstilkoblinger funnet</h3>
            <p>
              Du må legge til minst én børstilkobling før du kan starte live trading.
              <button 
                className="btn-link"
                onClick={() => navigate('/api-manager')}
              >
                Gå til API-tilkoblinger
              </button>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="trading-controls">
            <div className="control-group">
              <label>
                Velg Børs:
                <select 
                  value={selectedExchange || ''} 
                  onChange={(e) => handleExchangeChange(e.target.value)}
                  disabled={isActive}
                >
                  <option value="" disabled>Velg en børs</option>
                  {exchanges.map(exchange => (
                    <option key={exchange._id} value={exchange._id}>
                      {exchange.name} ({exchange.exchange})
                    </option>
                  ))}
                </select>
              </label>
              
              <button 
                className={`trading-toggle-btn ${isActive ? 'stop' : 'start'}`}
                onClick={handleToggleTrading}
                disabled={!selectedExchange}
              >
                {isActive ? 'Stopp Trading' : 'Start Trading'}
              </button>
            </div>
            
            <div className="control-status">
              <div className="status-label">Status:</div>
              <div className={`status-value ${isActive ? 'active' : 'inactive'}`}>
                {isActive ? 'Aktiv' : 'Inaktiv'}
              </div>
            </div>
          </div>
          
          <div className="live-trading-container">
            <LiveTradingPanel 
              isRunning={isActive}
              strategy={strategy}
              trades={trades}
              orders={orders}
              onClosePosition={(symbol) => console.log('Close position:', symbol)}
              onCancelOrder={(orderId) => console.log('Cancel order:', orderId)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default LiveTradingPage;
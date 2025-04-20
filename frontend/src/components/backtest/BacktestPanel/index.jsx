import React, { useState, useEffect } from 'react';
import { Play, Calendar, BarChart2, Settings } from 'lucide-react';

// API calls
import { getAvailableSymbols, getAvailableTimeframes } from '../../../api/marketDataApi';

// Styles
import './styles.css';

const BacktestPanel = ({ onRunBacktest, isRunning, strategy }) => {
  const [exchange, setExchange] = useState('binance');
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('1d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableSymbols, setAvailableSymbols] = useState([]);
  const [availableTimeframes, setAvailableTimeframes] = useState([]);
  const [parameters, setParameters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Set default dates (1 year back to today)
  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(oneYearAgo.toISOString().split('T')[0]);
  }, []);

  // Load available symbols when exchange changes
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        setLoading(true);
        const response = await getAvailableSymbols(exchange);
        setAvailableSymbols(response.data);
        
        // Set first symbol as default if none selected
        if (!symbol && response.data.length > 0) {
          setSymbol(response.data[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Feil ved henting av symboler:', err);
        setError('Kunne ikke laste symboler');
      } finally {
        setLoading(false);
      }
    };

    if (exchange) {
      fetchSymbols();
    }
  }, [exchange, symbol]);

  // Load available timeframes when exchange changes
  useEffect(() => {
    const fetchTimeframes = async () => {
      try {
        const response = await getAvailableTimeframes(exchange);
        setAvailableTimeframes(response.data);
        
        // Set first timeframe as default if none selected
        if (!timeframe && response.data.length > 0) {
          setTimeframe(response.data[0]);
        }
      } catch (err) {
        console.error('Feil ved henting av timeframes:', err);
      }
    };

    if (exchange) {
      fetchTimeframes();
    }
  }, [exchange, timeframe]);

  // Extract and set up strategy parameters if strategy exists
  useEffect(() => {
    if (strategy && strategy.flowData) {
      // Extract parameters from strategy nodes
      const extractedParams = {};
      
      // Simplified extraction - in a real app this would parse the flowData structure
      // to identify all configurable parameters like indicator periods, thresholds, etc.
      if (strategy.flowData.nodes) {
        strategy.flowData.nodes.forEach(node => {
          if (node.type === 'indicatorNode' && node.data) {
            const { id, data } = node;
            
            switch (data.indicatorType) {
              case 'SMA':
              case 'EMA':
                extractedParams[`${id}_period`] = data.period || 20;
                break;
              case 'RSI':
                extractedParams[`${id}_period`] = data.period || 14;
                break;
              case 'MACD':
                extractedParams[`${id}_fastPeriod`] = data.fastPeriod || 12;
                extractedParams[`${id}_slowPeriod`] = data.slowPeriod || 26;
                extractedParams[`${id}_signalPeriod`] = data.signalPeriod || 9;
                break;
              default:
                break;
            }
          } else if (node.type === 'conditionNode' && node.data) {
            extractedParams[`${node.id}_threshold`] = node.data.threshold || 0;
          }
        });
      }
      
      setParameters(extractedParams);
    }
  }, [strategy]);

  const handleParameterChange = (paramName, value) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleRunBacktest = () => {
    if (!exchange || !symbol || !timeframe || !startDate || !endDate) {
      setError('Alle felter må fylles ut');
      return;
    }
    
    const backtestParams = {
      exchange,
      symbol,
      timeframe,
      startDate,
      endDate,
      parameters
    };
    
    onRunBacktest(backtestParams);
  };

  return (
    <div className="backtest-panel">
      <div className="panel-header">
        <h2>Backtest Oppsett</h2>
      </div>
      
      <div className="panel-content">
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-section">
          <h3 className="section-title">
            <BarChart2 size={16} />
            <span>Markedsdata</span>
          </h3>
          
          <div className="form-group">
            <label htmlFor="exchange">Børs:</label>
            <select 
              id="exchange" 
              value={exchange} 
              onChange={(e) => setExchange(e.target.value)}
              disabled={isRunning}
            >
              <option value="binance">Binance</option>
              <option value="coinbase">Coinbase</option>
              <option value="ftx">FTX</option>
              <option value="tradingview">TradingView</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="symbol">Symbol:</label>
            <select 
              id="symbol" 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)}
              disabled={isRunning || loading}
            >
              {availableSymbols.length === 0 ? (
                <option value="">Laster symboler...</option>
              ) : (
                availableSymbols.map((sym) => (
                  <option key={sym} value={sym}>{sym}</option>
                ))
              )}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="timeframe">Tidsramme:</label>
            <select 
              id="timeframe" 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              disabled={isRunning}
            >
              {availableTimeframes.length === 0 ? (
                <option value="">Laster tidsrammer...</option>
              ) : (
                availableTimeframes.map((tf) => (
                  <option key={tf} value={tf}>{tf}</option>
                ))
              )}
            </select>
          </div>
        </div>
        
        <div className="form-section">
          <h3 className="section-title">
            <Calendar size={16} />
            <span>Tidsperiode</span>
          </h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Startdato:</label>
              <input 
                type="date" 
                id="startDate" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isRunning}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endDate">Sluttdato:</label>
              <input 
                type="date" 
                id="endDate" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isRunning}
              />
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <div 
            className="section-title-collapsible" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h3 className="section-title">
              <Settings size={16} />
              <span>Avanserte innstillinger</span>
            </h3>
            <span className={`toggle-icon ${showAdvanced ? 'open' : ''}`}>▼</span>
          </div>
          
          {showAdvanced && (
            <div className="advanced-parameters">
              {Object.keys(parameters).length > 0 ? (
                Object.entries(parameters).map(([paramName, value]) => (
                  <div className="form-group" key={paramName}>
                    <label htmlFor={paramName}>
                      {paramName.includes('_period') 
                        ? 'Periode' 
                        : paramName.includes('_threshold') 
                          ? 'Terskel' 
                          : paramName.replace(/_/g, ' ')}:
                    </label>
                    <input 
                      type="number" 
                      id={paramName} 
                      value={value} 
                      onChange={(e) => handleParameterChange(paramName, parseInt(e.target.value))}
                      disabled={isRunning}
                    />
                  </div>
                ))
              ) : (
                <p className="no-params">Ingen justerbare parametere funnet for denne strategien.</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="panel-footer">
        <button 
          className="run-backtest-btn" 
          onClick={handleRunBacktest}
          disabled={isRunning || !exchange || !symbol || !timeframe || !startDate || !endDate}
        >
          <Play size={16} />
          <span>{isRunning ? 'Kjører Backtest...' : 'Kjør Backtest'}</span>
        </button>
      </div>
    </div>
  );
};

export default BacktestPanel;
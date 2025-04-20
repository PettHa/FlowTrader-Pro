// frontend/src/pages/StrategyDetails/index.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, BarChart2, Play, List, Calendar, ArrowUpRight, ArrowDownRight,
  PieChart, RefreshCw, Trash2, Clock
} from 'lucide-react';

// API calls
import { getStrategy, deleteStrategy } from '../../api/strategyApi';
import { getBacktestResults } from '../../api/backtestApi';
import { getActiveTrades } from '../../api/tradingApi';

import './styles.css';

const StrategyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [strategy, setStrategy] = useState(null);
  const [backtests, setBacktests] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch strategy details
        const strategyResponse = await getStrategy(id);
        setStrategy(strategyResponse.data);
        
        // Fetch backtests
        const backtestsResponse = await getBacktestResults(id);
        setBacktests(backtestsResponse.data);
        
        // Fetch active trades
        const tradesResponse = await getActiveTrades();
        // Filter for this strategy only
        setTrades(tradesResponse.data.filter(trade => trade.strategy === id));
        
        setError(null);
      } catch (err) {
        console.error('Error fetching strategy details:', err);
        setError('Kunne ikke laste strategidetaljer');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);
  
  const handleDeleteStrategy = async () => {
    if (window.confirm('Er du sikker på at du vil slette denne strategien? Denne handlingen kan ikke angres.')) {
      try {
        await deleteStrategy(id);
        navigate('/strategies');
      } catch (err) {
        console.error('Error deleting strategy:', err);
        setError('Kunne ikke slette strategien');
      }
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw size={32} className="animate-spin" />
        <p>Laster strategi...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/strategies')}>
          Tilbake til Strategier
        </button>
      </div>
    );
  }
  
  if (!strategy) {
    return (
      <div className="error-container">
        <p>Strategien ble ikke funnet</p>
        <button className="btn btn-primary" onClick={() => navigate('/strategies')}>
          Tilbake til Strategier
        </button>
      </div>
    );
  }
  
  // Calculate some stats for overview
  const latestBacktest = backtests.length > 0 ? backtests[0] : null;
  const activeTrades = trades.filter(trade => !trade.exitTime).length;
  const isActive = strategy.isActive || false;
  
  return (
    <div className="strategy-details-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/strategies')}>
          <ArrowLeft size={16} />
          <span>Tilbake</span>
        </button>
        
        <div className="strategy-title-container">
          <h1 className="page-title">{strategy.name}</h1>
          <div className={`strategy-status ${isActive ? 'active' : 'inactive'}`}>
            {isActive ? 'Aktiv' : 'Inaktiv'}
          </div>
        </div>
        
        <div className="page-actions">
          <Link to={`/strategy/${id}/builder`} className="btn btn-secondary">
            <Edit size={16} />
            <span>Rediger</span>
          </Link>
          
          <Link to={`/strategy/${id}/backtest`} className="btn btn-secondary">
            <BarChart2 size={16} />
            <span>Backtest</span>
          </Link>
          
          <Link to={`/strategy/${id}/live`} className="btn btn-primary">
            <Play size={16} />
            <span>Live Trading</span>
          </Link>
        </div>
      </div>
      
      <div className="strategy-details-container">
        <div className="tabs-container">
          <div className="tabs-header">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <List size={16} />
              <span>Oversikt</span>
            </button>
            
            <button 
              className={`tab-btn ${activeTab === 'backtests' ? 'active' : ''}`}
              onClick={() => setActiveTab('backtests')}
            >
              <BarChart2 size={16} />
              <span>Backtests</span>
              {backtests.length > 0 && (
                <span className="tab-count">{backtests.length}</span>
              )}
            </button>
            
            <button 
              className={`tab-btn ${activeTab === 'trades' ? 'active' : ''}`}
              onClick={() => setActiveTab('trades')}
            >
              <Play size={16} />
              <span>Handler</span>
              {trades.length > 0 && (
                <span className="tab-count">{trades.length}</span>
              )}
            </button>
          </div>
          
          <div className="tabs-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="strategy-description">
                  <h3>Beskrivelse</h3>
                  <p>{strategy.description || 'Ingen beskrivelse tilgjengelig.'}</p>
                  
                  <div className="strategy-meta">
                    <div className="meta-item">
                      <span className="meta-label">Opprettet</span>
                      <span className="meta-value">
                        {new Date(strategy.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Sist oppdatert</span>
                      <span className="meta-value">
                        {new Date(strategy.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {strategy.markets && strategy.markets.length > 0 && (
                      <div className="meta-item">
                        <span className="meta-label">Markeder</span>
                        <span className="meta-value">
                          {strategy.markets.map(market => 
                            `${market.exchange}:${market.symbol} (${market.timeframe})`
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-header">
                      <Calendar size={16} />
                      <span>Backtests</span>
                    </div>
                    <div className="stat-value">{backtests.length}</div>
                    {latestBacktest && (
                      <div className="stat-footer">
                        Siste: {new Date(latestBacktest.createdAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-header">
                      <Play size={16} />
                      <span>Aktive Handler</span>
                    </div>
                    <div className="stat-value">{activeTrades}</div>
                    <div className="stat-footer">
                      Totalt: {trades.length} handler
                    </div>
                  </div>
                  
                  {latestBacktest && (
                    <>
                      <div className="stat-card">
                        <div className="stat-header">
                          <PieChart size={16} />
                          <span>Win Rate</span>
                        </div>
                        <div className="stat-value">
                          {latestBacktest.summary.winRate.toFixed(2)}%
                        </div>
                        <div className="stat-footer">
                          Siste backtest
                        </div>
                      </div>
                      
                      <div className="stat-card">
                        <div className="stat-header">
                          {latestBacktest.summary.annualReturn >= 0 ? 
                            <ArrowUpRight size={16} className="text-green" /> : 
                            <ArrowDownRight size={16} className="text-red" />
                          }
                          <span>Årlig avkastning</span>
                        </div>
                        <div className={`stat-value ${latestBacktest.summary.annualReturn >= 0 ? 'text-green' : 'text-red'}`}>
                          {latestBacktest.summary.annualReturn.toFixed(2)}%
                        </div>
                        <div className="stat-footer">
                          Siste backtest
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="danger-zone">
                  <h3>Faresone</h3>
                  <p>
                    Vær forsiktig! Sletting av en strategi kan ikke angres og vil fjerne all relatert data.
                  </p>
                  <button 
                    className="btn btn-danger"
                    onClick={handleDeleteStrategy}
                  >
                    <Trash2 size={16} />
                    <span>Slett Strategi</span>
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'backtests' && (
              <div className="backtests-tab">
                <div className="tab-header">
                  <h3>Backtest Historikk</h3>
                  <Link to={`/strategy/${id}/backtest`} className="btn btn-primary btn-sm">
                    <BarChart2 size={14} />
                    <span>Kjør Ny Backtest</span>
                  </Link>
                </div>
                
                {backtests.length === 0 ? (
                  <div className="empty-state">
                    <p>Ingen backtests er kjørt for denne strategien ennå.</p>
                    <Link to={`/strategy/${id}/backtest`} className="btn btn-primary">
                      <BarChart2 size={16} />
                      <span>Kjør Første Backtest</span>
                    </Link>
                  </div>
                ) : (
                  <div className="backtests-list">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Dato</th>
                          <th>Marked</th>
                          <th>Periode</th>
                          <th>Handler</th>
                          <th>Win Rate</th>
                          <th>Avkastning</th>
                          <th>Sluttverdi</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtests.map(backtest => (
                          <tr key={backtest._id}>
                            <td>{new Date(backtest.createdAt).toLocaleString()}</td>
                            <td>{backtest.market.exchange}:{backtest.market.symbol}</td>
                            <td>
                              {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
                            </td>
                            <td>{backtest.summary.totalTrades}</td>
                            <td>{backtest.summary.winRate.toFixed(2)}%</td>
                            <td className={backtest.summary.annualReturn >= 0 ? 'text-green' : 'text-red'}>
                              {backtest.summary.annualReturn.toFixed(2)}%
                            </td>
                            <td>${backtest.summary.finalEquity.toFixed(2)}</td>
                            <td>
                              <Link to={`/strategy/${id}/backtest?result=${backtest._id}`} className="btn-link">
                                Detaljer
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'trades' && (
              <div className="trades-tab">
                <div className="tab-header">
                  <h3>Handelshistorikk</h3>
                  <Link to={`/strategy/${id}/live`} className="btn btn-primary btn-sm">
                    <Play size={14} />
                    <span>Live Trading</span>
                  </Link>
                </div>
                
                {trades.length === 0 ? (
                  <div className="empty-state">
                    <p>Ingen handler er utført med denne strategien ennå.</p>
                    <Link to={`/strategy/${id}/live`} className="btn btn-primary">
                      <Play size={16} />
                      <span>Start Live Trading</span>
                    </Link>
                  </div>
                ) : (
                  <div className="trades-list">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Type</th>
                          <th>Retning</th>
                          <th>Størrelse</th>
                          <th>Inngang</th>
                          <th>Utgang</th>
                          <th>P/L</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map(trade => (
                          <tr key={trade._id}>
                            <td>{trade.symbol}</td>
                            <td>{trade.orderType}</td>
                            <td className={trade.positionType === 'LONG' ? 'text-green' : 'text-red'}>
                              {trade.positionType}
                            </td>
                            <td>{trade.quantity}</td>
                            <td>
                              ${trade.price?.toFixed(2) || 'N/A'}
                              {trade.entryTime && (
                                <div className="trade-time">
                                  <Clock size={12} />
                                  {new Date(trade.entryTime).toLocaleTimeString()}
                                </div>
                              )}
                            </td>
                            <td>
                              {trade.exitTime ? (
                                <>
                                  ${trade.exitPrice?.toFixed(2) || 'N/A'}
                                  <div className="trade-time">
                                    <Clock size={12} />
                                    {new Date(trade.exitTime).toLocaleTimeString()}
                                  </div>
                                </>
                              ) : '-'}
                            </td>
                            <td className={trade.profit >= 0 ? 'text-green' : 'text-red'}>
                              {trade.profit ? `$${trade.profit.toFixed(2)}` : '-'}
                              {trade.profitPercent && ` (${trade.profitPercent.toFixed(2)}%)`}
                            </td>
                            <td>
                              <span className={`status-badge ${trade.status.toLowerCase()}`}>
                                {trade.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyDetailsPage;
import React, { useState, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, Database, Plus, 
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Custom hooks
import { useAuth } from '../../hooks/useAuth';

// API
import { getStrategies } from '../../api/strategyApi';
import { getActiveTrades } from '../../api/tradingApi';
import { getBacktestResults } from '../../api/backtestApi';

// Styles
import './styles.css';

// Example metrics for demo purposes
const METRICS = [
  { 
    name: 'Aktive Strategier', 
    value: 0,
    icon: <TrendingUp size={20} />,
    color: 'blue' 
  },
  { 
    name: 'Åpne Posisjoner', 
    value: 0,
    icon: <Database size={20} />,
    color: 'green' 
  },
  { 
    name: 'Dagens P/L', 
    value: '$0.00',
    icon: <BarChart2 size={20} />,
    color: 'purple',
    isProfit: true
  }
];

const Dashboard = () => {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [metrics, setMetrics] = useState(METRICS);
  const [recentTrades, setRecentTrades] = useState([]);
  const [recentBacktests, setRecentBacktests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch strategies
        const strategiesResponse = await getStrategies();
        setStrategies(strategiesResponse.data.slice(0, 3)); // Only get first 3 for recent
        
        // Fetch active trades
        const tradesResponse = await getActiveTrades();
        setRecentTrades(tradesResponse.data.slice(0, 5)); // Only get first 5 for recent
        
        // Update metrics
        setMetrics([
          {
            name: 'Aktive Strategier',
            value: strategiesResponse.data.filter(s => s.isActive).length,
            icon: <TrendingUp size={20} />,
            color: 'blue'
          },
          {
            name: 'Åpne Posisjoner',
            value: tradesResponse.data.length,
            icon: <Database size={20} />,
            color: 'green'
          },
          {
            name: 'Dagens P/L',
            // Calculate P/L from trades
            value: `$${tradesResponse.data.reduce((sum, trade) => sum + (trade.profit || 0), 0).toFixed(2)}`,
            icon: <BarChart2 size={20} />,
            color: 'purple',
            isProfit: tradesResponse.data.reduce((sum, trade) => sum + (trade.profit || 0), 0) >= 0
          }
        ]);
        
        // Fetch recent backtests results
        // This would be a combined API call in a real implementation
        const backtestsPromises = strategiesResponse.data.slice(0, 3).map(strategy => 
          getBacktestResults(strategy._id)
        );
        const backtestsResponses = await Promise.all(backtestsPromises);
        
        // Flatten and sort by date
        const allBacktests = backtestsResponses
          .flatMap(response => response.data)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
          
        setRecentBacktests(allBacktests);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="page-title">Velkommen, {user?.name || 'Trader'}</h1>
        <div className="header-actions">
          <Link to="/strategies/new" className="button button-primary">
            <Plus size={16} />
            <span>Ny Strategi</span>
          </Link>
        </div>
      </div>
      
      <div className="metrics-grid">
        {metrics.map((metric, index) => (
          <div key={index} className={`metric-card metric-${metric.color}`}>
            <div className="metric-icon">{metric.icon}</div>
            <div className="metric-content">
              <h3 className="metric-name">{metric.name}</h3>
              <div className={`metric-value ${metric.isProfit !== undefined ? (metric.isProfit ? 'profit' : 'loss') : ''}`}>
                {metric.isProfit !== undefined && (
                  metric.isProfit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />
                )}
                <span>{metric.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Nylige Strategier</h2>
            <Link to="/strategies" className="card-link">Se alle</Link>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-placeholder">Laster inn strategier...</div>
            ) : strategies.length > 0 ? (
              <div className="strategies-list">
                {strategies.map(strategy => (
                  <div key={strategy._id} className="strategy-item">
                    <div className="strategy-info">
                      <h3 className="strategy-name">{strategy.name}</h3>
                      <p className="strategy-description">{strategy.description || 'Ingen beskrivelse'}</p>
                    </div>
                    <div className="strategy-actions">
                      <Link to={`/strategy/${strategy._id}/builder`} className="action-link">Endre</Link>
                      <Link to={`/strategy/${strategy._id}/backtest`} className="action-link">Backtest</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Ingen strategier ennå</p>
                <Link to="/strategies/new" className="button button-small">
                  <Plus size={14} />
                  <span>Opprett Strategi</span>
                </Link>
              </div>
            )}
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Nylige Handler</h2>
            <Link to="/trading-history" className="card-link">Se alle</Link>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-placeholder">Laster inn handler...</div>
            ) : recentTrades.length > 0 ? (
              <div className="trades-list">
                {recentTrades.map(trade => (
                  <div key={trade._id} className="trade-item">
                    <div className="trade-symbol">{trade.symbol}</div>
                    <div className="trade-details">
                      <span className={`trade-type ${trade.positionType.toLowerCase()}`}>
                        {trade.positionType}
                      </span>
                      <span className="trade-price">${trade.entryPrice.toFixed(2)}</span>
                    </div>
                    <div className={`trade-profit ${trade.profit >= 0 ? 'profit' : 'loss'}`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Ingen handler ennå</p>
                <Link to="/strategies" className="button button-small">Utforsk strategier</Link>
              </div>
            )}
          </div>
        </div>
        
        <div className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">Nylige Backtests</h2>
            <Link to="/backtests" className="card-link">Se alle</Link>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-placeholder">Laster inn backtests...</div>
            ) : recentBacktests.length > 0 ? (
              <div className="backtests-list">
                {recentBacktests.map(backtest => (
                  <div key={backtest._id} className="backtest-item">
                    <div className="backtest-info">
                      <h3 className="backtest-name">
                        {backtest.strategy ? backtest.strategy.name : 'Ukjent strategi'}
                      </h3>
                      <p className="backtest-date">
                        {new Date(backtest.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="backtest-metrics">
                      <div className="backtest-metric">
                        <span className="metric-label">Win Rate</span>
                        <span className="metric-value">{backtest.summary.winRate.toFixed(2)}%</span>
                      </div>
                      <div className="backtest-metric">
                        <span className="metric-label">Profit</span>
                        <span className={`metric-value ${backtest.summary.annualReturn >= 0 ? 'profit' : 'loss'}`}>
                          {backtest.summary.annualReturn.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Ingen backtests ennå</p>
                <Link to="/strategies" className="button button-small">Kjør en backtest</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
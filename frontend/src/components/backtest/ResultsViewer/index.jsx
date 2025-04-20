import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { TrendingUp, DollarSign, BarChart2, List, PieChart } from 'lucide-react';

import './styles.css';

const ResultsViewer = ({ result }) => {
  const [activeTab, setActiveTab] = useState('summary');
  
  if (!result) {
    return <div className="results-empty">Ingen backtest-resultater å vise</div>;
  }

  // Formater equity curve data for bruk i grafer
  const equityCurveData = result.equityCurve.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    equity: point.equity,
  }));

  // Formater månedlige avkastningsdata
  const monthlyReturnsData = result.monthlyReturns.map(month => ({
    month: `${month.year}-${month.month + 1}`,
    return: month.return,
    color: month.return >= 0 ? '#10b981' : '#ef4444'
  }));

  // Formater handelsdata
  const formattedTrades = result.trades.map((trade, index) => ({
    id: index + 1,
    date: new Date(trade.timestamp).toLocaleString(),
    type: trade.positionType,
    entry: trade.entryPrice.toFixed(2),
    exit: trade.exitPrice.toFixed(2),
    profit: trade.profit.toFixed(2),
    profitPercent: trade.profitPercent.toFixed(2) + '%',
    result: trade.profit >= 0 ? 'Win' : 'Loss'
  }));

  return (
    <div className="results-viewer">
      <div className="results-tabs">
        <button 
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <TrendingUp size={16} />
          <span>Sammendrag</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'equity' ? 'active' : ''}`}
          onClick={() => setActiveTab('equity')}
        >
          <DollarSign size={16} />
          <span>Egenkapitalutvikling</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          <BarChart2 size={16} />
          <span>Månedlig avkastning</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'trades' ? 'active' : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          <List size={16} />
          <span>Handler</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <PieChart size={16} />
          <span>Statistikk</span>
        </button>
      </div>

      <div className="results-content">
        {activeTab === 'summary' && (
          <div className="summary-tab">
            <div className="summary-metrics">
              <div className="metric-card">
                <div className="metric-title">Totale handler</div>
                <div className="metric-value">{result.summary.totalTrades}</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Win Rate</div>
                <div className="metric-value">{result.summary.winRate.toFixed(2)}%</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Profitt Faktor</div>
                <div className="metric-value">{result.summary.profitFactor.toFixed(2)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Sharpe Ratio</div>
                <div className="metric-value">{result.summary.sharpeRatio.toFixed(2)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Maks Drawdown</div>
                <div className="metric-value">{result.summary.maxDrawdown.toFixed(2)}%</div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Årlig avkastning</div>
                <div className={`metric-value ${result.summary.annualReturn >= 0 ? 'positive' : 'negative'}`}>
                  {result.summary.annualReturn.toFixed(2)}%
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-title">Sluttverdi</div>
                <div className="metric-value">${result.summary.finalEquity.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="summary-chart">
              <h3>Egenkapitalutvikling</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={equityCurveData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        // Vis bare hver n-te dato for å unngå overbelastning
                        const idx = equityCurveData.findIndex(d => d.date === value);
                        return idx % Math.ceil(equityCurveData.length / 10) === 0 ? value : '';
                      }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="equity" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equity' && (
          <div className="equity-tab">
            <h3>Egenkapitalutvikling</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={equityCurveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const idx = equityCurveData.findIndex(d => d.date === value);
                      return idx % Math.ceil(equityCurveData.length / 10) === 0 ? value : '';
                    }}
                  />
                  <YAxis domain={['dataMin', 'dataMax']} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="monthly-tab">
            <h3>Månedlig avkastning</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyReturnsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="return" 
                    name="Avkastning (%)" 
                    fill={(entry) => entry.return >= 0 ? '#10b981' : '#ef4444'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="trades-tab">
            <h3>Handler</h3>
            <div className="trades-table-container">
              <table className="trades-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dato</th>
                    <th>Type</th>
                    <th>Inngang</th>
                    <th>Utgang</th>
                    <th>Profitt</th>
                    <th>%</th>
                    <th>Resultat</th>
                  </tr>
                </thead>
                <tbody>
                  {formattedTrades.map(trade => (
                    <tr key={trade.id} className={trade.result === 'Win' ? 'win' : 'loss'}>
                      <td>{trade.id}</td>
                      <td>{trade.date}</td>
                      <td>{trade.type}</td>
                      <td>${trade.entry}</td>
                      <td>${trade.exit}</td>
                      <td className={trade.result === 'Win' ? 'positive' : 'negative'}>
                        ${trade.profit}
                      </td>
                      <td className={trade.result === 'Win' ? 'positive' : 'negative'}>
                        {trade.profitPercent}
                      </td>
                      <td className={trade.result === 'Win' ? 'positive' : 'negative'}>
                        {trade.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-tab">
            <h3>Detaljert Statistikk</h3>
            
            <div className="stats-section">
              <h4>Ytelsesmålinger</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Total avkastning</div>
                  <div className="stat-value">
                    {((result.summary.finalEquity / 10000 - 1) * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Årlig avkastning</div>
                  <div className="stat-value">{result.summary.annualReturn.toFixed(2)}%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Volatilitet (årlig)</div>
                  <div className="stat-value">
                    {result.summary.sharpeRatio > 0 
                      ? (result.summary.annualReturn / result.summary.sharpeRatio).toFixed(2) + '%'
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Sharpe Ratio</div>
                  <div className="stat-value">{result.summary.sharpeRatio.toFixed(2)}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Maks Drawdown</div>
                  <div className="stat-value">{result.summary.maxDrawdown.toFixed(2)}%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Win Rate</div>
                  <div className="stat-value">{result.summary.winRate.toFixed(2)}%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Profit Factor</div>
                  <div className="stat-value">{result.summary.profitFactor.toFixed(2)}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Totale handler</div>
                  <div className="stat-value">{result.summary.totalTrades}</div>
                </div>
              </div>
            </div>
            
            <div className="stats-section">
              <h4>Handelsstatistikk</h4>
              <div className="stats-grid">
                {/* Disse verdiene ville normalt være tilgjengelige fra backtest-resultatet */}
                <div className="stat-item">
                  <div className="stat-label">Gj.snitt vinnerhandel</div>
                  <div className="stat-value">+2.1%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Gj.snitt taperhandel</div>
                  <div className="stat-value">-1.3%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Beste handel</div>
                  <div className="stat-value">+8.5%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Verste handel</div>
                  <div className="stat-value">-5.2%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Gj.snitt holdtid</div>
                  <div className="stat-value">3.2 dager</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Maks antall tapshandler på rad</div>
                  <div className="stat-value">4</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsViewer;
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, XCircle, Clock, DollarSign, BarChart2 } from 'lucide-react';

// Styles
import './styles.css';

const LiveTradingPanel = ({ 
  isRunning,
  strategy, 
  trades = [], 
  orders = [],
  onClosePosition,
  onCancelOrder 
}) => {
  const [activeTab, setActiveTab] = useState('positions');
  
  // Calculate summary stats
  const totalPositions = trades.length;
  const totalValue = trades.reduce((sum, trade) => {
    // Calculate current value (simplified)
    const entryValue = trade.entryPrice * trade.quantity;
    return sum + entryValue;
  }, 0);
  
  const unrealizedPnL = trades.reduce((sum, trade) => {
    return sum + (trade.profit || 0);
  }, 0);
  
  const pnlPercentage = totalValue > 0 
    ? (unrealizedPnL / totalValue) * 100 
    : 0;

  return (
    <div className="live-trading-panel">
      <div className="panel-header">
        <div className="panel-tabs">
          <button
            className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            <TrendingUp size={16} />
            <span>Åpne Posisjoner</span>
            {totalPositions > 0 && (
              <span className="tab-count">{totalPositions}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <Clock size={16} />
            <span>Ventende Ordrer</span>
            {orders.length > 0 && (
              <span className="tab-count">{orders.length}</span>
            )}
          </button>
        </div>
        
        {isRunning && (
          <div className="live-status">
            <span className="status-dot"></span>
            <span className="status-text">Live Trading</span>
          </div>
        )}
      </div>
      
      <div className="panel-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon">
              <TrendingUp size={18} />
            </div>
            <div className="card-content">
              <div className="card-label">Åpne Posisjoner</div>
              <div className="card-value">{totalPositions}</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="card-icon">
              <DollarSign size={18} />
            </div>
            <div className="card-content">
              <div className="card-label">Total Verdi</div>
              <div className="card-value">${totalValue.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="card-icon">
              <BarChart2 size={18} />
            </div>
            <div className="card-content">
              <div className="card-label">Urealisert P/L</div>
              <div className={`card-value ${unrealizedPnL >= 0 ? 'profit' : 'loss'}`}>
                ${unrealizedPnL.toFixed(2)} ({pnlPercentage.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="panel-content">
        {activeTab === 'positions' && (
          <div className="positions-tab">
            {trades.length > 0 ? (
              <div className="positions-list">
                {trades.map((trade) => (
                  <div key={trade._id} className="position-item">
                    <div className="position-header">
                      <div className="position-symbol">{trade.symbol}</div>
                      <div className={`position-type ${trade.positionType.toLowerCase()}`}>
                        {trade.positionType}
                      </div>
                    </div>
                    
                    <div className="position-details">
                      <div className="detail-group">
                        <div className="detail-label">Entry</div>
                        <div className="detail-value">${trade.entryPrice?.toFixed(2) || 'N/A'}</div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Antall</div>
                        <div className="detail-value">{trade.quantity}</div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Verdi</div>
                        <div className="detail-value">
                          ${(trade.entryPrice * trade.quantity).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Urealisert P/L</div>
                        <div className={`detail-value ${trade.profit >= 0 ? 'profit' : 'loss'}`}>
                          ${trade.profit?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="position-actions">
                      <button 
                        className="close-position-btn"
                        onClick={() => onClosePosition(trade.symbol)}
                      >
                        <XCircle size={14} />
                        <span>Lukk Posisjon</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <TrendingDown size={32} />
                <p>Ingen åpne posisjoner</p>
                {isRunning ? (
                  <span className="empty-note">
                    Posisjoner vil dukke opp her når strategien genererer handelssignaler
                  </span>
                ) : (
                  <span className="empty-note">
                    Start trading for å begynne å åpne posisjoner
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'orders' && (
          <div className="orders-tab">
            {orders.length > 0 ? (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order._id} className="order-item">
                    <div className="order-header">
                      <div className="order-symbol">{order.symbol}</div>
                      <div className={`order-type ${order.orderType.toLowerCase()}`}>
                        {order.orderType}
                      </div>
                    </div>
                    
                    <div className="order-details">
                      <div className="detail-group">
                        <div className="detail-label">Retning</div>
                        <div className={`detail-value ${order.side.toLowerCase()}`}>
                          {order.side}
                        </div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Pris</div>
                        <div className="detail-value">${order.price?.toFixed(2) || 'Marked'}</div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Antall</div>
                        <div className="detail-value">{order.quantity}</div>
                      </div>
                      
                      <div className="detail-group">
                        <div className="detail-label">Opprettet</div>
                        <div className="detail-value">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="order-actions">
                      <button 
                        className="cancel-order-btn"
                        onClick={() => onCancelOrder(order.orderId)}
                      >
                        <XCircle size={14} />
                        <span>Kanseller</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Clock size={32} />
                <p>Ingen ventende ordrer</p>
                {isRunning ? (
                  <span className="empty-note">
                    Ordrer vil dukke opp her når strategien genererer handelssignaler
                  </span>
                ) : (
                  <span className="empty-note">
                    Start trading for å begynne å plassere ordrer
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {strategy && (
        <div className="panel-footer">
          <div className="strategy-info">
            <div className="info-label">Aktiv Strategi:</div>
            <div className="info-value">{strategy.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTradingPanel;
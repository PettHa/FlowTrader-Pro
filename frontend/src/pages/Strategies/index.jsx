import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Filter, TrendingUp, BarChart2, 
  Play, Edit, Trash2, MoreVertical 
} from 'lucide-react';

// API calls
import { getStrategies, deleteStrategy } from '../../api/strategyApi';

// Styles
import './styles.css';

const StrategiesPage = () => {
  const [strategies, setStrategies] = useState([]);
  const [filteredStrategies, setFilteredStrategies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch strategies
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setLoading(true);
        const response = await getStrategies();
        setStrategies(response.data);
        setFilteredStrategies(response.data);
      } catch (err) {
        console.error('Error fetching strategies:', err);
        setError('Kunne ikke laste inn strategier');
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  // Apply search and filter
  useEffect(() => {
    // First apply the filter
    let results = strategies;
    
    if (filter === 'active') {
      results = strategies.filter(strategy => strategy.isActive);
    } else if (filter === 'inactive') {
      results = strategies.filter(strategy => !strategy.isActive);
    }
    
    // Then apply the search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(strategy => 
        strategy.name.toLowerCase().includes(query) ||
        (strategy.description && strategy.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredStrategies(results);
  }, [strategies, searchQuery, filter]);

  // Handle strategy deletion
  const handleDeleteStrategy = async (id, event) => {
    event.stopPropagation(); // Prevent card click
    
    if (window.confirm('Er du sikker på at du vil slette denne strategien?')) {
      try {
        await deleteStrategy(id);
        setStrategies(prev => prev.filter(strategy => strategy._id !== id));
      } catch (err) {
        console.error('Error deleting strategy:', err);
        alert('Kunne ikke slette strategien');
      }
    }
  };

  return (
    <div className="strategies-page">
      <div className="page-header">
        <h1 className="page-title">Mine Strategier</h1>
        <div className="header-actions">
          <Link to="/strategy/new/builder" className="btn btn-primary">
            <Plus size={16} />
            <span>Ny Strategi</span>
          </Link>
        </div>
      </div>
      
      <div className="strategies-toolbar">
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text"
            placeholder="Søk etter strategier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-label">
            <Filter size={16} />
            <span>Filter:</span>
          </div>
          <div className="filter-options">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
              onClick={() => setFilter('all')}
            >
              Alle
            </button>
            <button 
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`} 
              onClick={() => setFilter('active')}
            >
              Aktive
            </button>
            <button 
              className={`filter-btn ${filter === 'inactive' ? 'active' : ''}`} 
              onClick={() => setFilter('inactive')}
            >
              Inaktive
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Laster inn strategier...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Prøv igjen
          </button>
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="empty-strategies">
          {searchQuery || filter !== 'all' ? (
            <>
              <p>Ingen strategier matcher søket ditt</p>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
              >
                Fjern filtre
              </button>
            </>
          ) : (
            <>
              <p>Du har ingen strategier ennå</p>
              <Link to="/strategy/new/builder" className="btn btn-primary">
                <Plus size={16} />
                <span>Opprett din første strategi</span>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="strategies-grid">
          {filteredStrategies.map(strategy => (
            <div key={strategy._id} className="strategy-card">
              <div className="strategy-card-header">
                <div className="strategy-status">
                  <span className={`status-indicator ${strategy.isActive ? 'active' : 'inactive'}`}></span>
                  <span className="status-text">{strategy.isActive ? 'Aktiv' : 'Inaktiv'}</span>
                </div>
                <div className="strategy-actions">
                  <button className="icon-button" title="Flere handlinger">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="strategy-name">{strategy.name}</h3>
              <p className="strategy-description">
                {strategy.description || 'Ingen beskrivelse'}
              </p>
              
              <div className="strategy-meta">
                <div className="meta-item">
                  <span className="meta-label">Opprettet</span>
                  <span className="meta-value">
                    {new Date(strategy.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Sist endret</span>
                  <span className="meta-value">
                    {new Date(strategy.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="strategy-footer">
                <Link 
                  to={`/strategy/${strategy._id}/builder`} 
                  className="card-action-btn builder"
                  title="Rediger strategi"
                >
                  <Edit size={14} />
                  <span>Rediger</span>
                </Link>
                
                <Link 
                  to={`/strategy/${strategy._id}/backtest`} 
                  className="card-action-btn backtest"
                  title="Backtest strategi"
                >
                  <BarChart2 size={14} />
                  <span>Backtest</span>
                </Link>
                
                <Link 
                  to={`/strategy/${strategy._id}/live`} 
                  className="card-action-btn live"
                  title="Live trading"
                >
                  <Play size={14} />
                  <span>Trading</span>
                </Link>
                
                <button 
                  className="card-action-btn delete"
                  onClick={(e) => handleDeleteStrategy(strategy._id, e)}
                  title="Slett strategi"
                >
                  <Trash2 size={14} />
                  <span>Slett</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StrategiesPage;
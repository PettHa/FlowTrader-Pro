import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

// API
import { 
  createExchange, 
  updateExchange, 
  deleteExchange, 
  testExchangeConnection 
} from '../../../api/exchangeApi';

// Styles
import './styles.css';

const APIManager = ({ 
  initialExchanges = [], 
  onExchangeAdded, 
  onExchangeRemoved, 
  onExchangeUpdated 
}) => {
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [showForm, setShowForm] = useState(false);
  const [editingExchange, setEditingExchange] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    exchange: 'binance',
    apiKey: '',
    secretKey: '',
    passphrase: '',
    subaccount: '',
    isPaper: false
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});

  // Toggle visibility for API keys
  const toggleSecretVisibility = (field, id) => {
    setShowSecrets(prev => ({
      ...prev,
      [`${field}_${id}`]: !prev[`${field}_${id}`]
    }));
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open form for new exchange
  const handleAddExchange = () => {
    setFormData({
      name: '',
      exchange: 'binance',
      apiKey: '',
      secretKey: '',
      passphrase: '',
      subaccount: '',
      isPaper: false
    });
    setEditingExchange(null);
    setTestResult(null);
    setError(null);
    setShowForm(true);
  };

  // Open form for editing exchange
  const handleEditExchange = (exchange) => {
    setFormData({
      name: exchange.name,
      exchange: exchange.exchange,
      apiKey: '', // Don't show existing API keys for security
      secretKey: '',
      passphrase: '',
      subaccount: exchange.credentials?.subaccount || '',
      isPaper: exchange.credentials?.isPaper || false
    });
    setEditingExchange(exchange);
    setTestResult(null);
    setError(null);
    setShowForm(true);
  };

  // Test connection to exchange
  const handleTestConnection = async () => {
    if (!formData.name || !formData.apiKey || !formData.secretKey) {
      setError('Vennligst fyll ut alle påkrevde felt');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      
      const testData = {
        exchange: formData.exchange,
        credentials: {
          apiKey: formData.apiKey,
          secretKey: formData.secretKey,
          passphrase: formData.passphrase,
          subaccount: formData.subaccount,
          isPaper: formData.isPaper
        }
      };
      
      const response = await testExchangeConnection(testData);
      setTestResult({
        success: response.success,
        message: response.message
      });
    } catch (err) {
      console.error('Feil ved testing av tilkobling:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Tilkoblingen feilet. Sjekk API-nøklene dine.'
      });
    } finally {
      setTesting(false);
    }
  };

  // Save exchange (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || (!editingExchange && (!formData.apiKey || !formData.secretKey))) {
      setError('Vennligst fyll ut alle påkrevde felt');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const exchangeData = {
        name: formData.name,
        exchange: formData.exchange,
        credentials: {
          apiKey: formData.apiKey || undefined,
          secretKey: formData.secretKey || undefined,
          passphrase: formData.passphrase || undefined,
          subaccount: formData.subaccount || undefined,
          isPaper: formData.isPaper
        }
      };
      
      if (editingExchange) {
        // Update existing exchange
        const response = await updateExchange(editingExchange._id, exchangeData);
        
        // Update local state
        setExchanges(prev => 
          prev.map(ex => ex._id === editingExchange._id ? response.data : ex)
        );
        
        // Notify parent
        if (onExchangeUpdated) {
          onExchangeUpdated(response.data);
        }
      } else {
        // Create new exchange
        const response = await createExchange(exchangeData);
        
        // Update local state
        setExchanges(prev => [...prev, response.data]);
        
        // Notify parent
        if (onExchangeAdded) {
          onExchangeAdded(response.data);
        }
      }
      
      // Reset form
      setShowForm(false);
      setEditingExchange(null);
      setFormData({
        name: '',
        exchange: 'binance',
        apiKey: '',
        secretKey: '',
        passphrase: '',
        subaccount: '',
        isPaper: false
      });
    } catch (err) {
      console.error('Feil ved lagring av børstilkobling:', err);
      setError(err.response?.data?.message || 'Kunne ikke lagre børstilkoblingen');
    } finally {
      setLoading(false);
    }
  };

  // Delete exchange
  const handleDeleteExchange = async (id) => {
    if (window.confirm('Er du sikker på at du vil slette denne børstilkoblingen?')) {
      try {
        await deleteExchange(id);
        
        // Update local state
        setExchanges(prev => prev.filter(ex => ex._id !== id));
        
        // Notify parent
        if (onExchangeRemoved) {
          onExchangeRemoved(id);
        }
      } catch (err) {
        console.error('Feil ved sletting av børstilkobling:', err);
        alert('Kunne ikke slette børstilkoblingen');
      }
    }
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingExchange(null);
    setError(null);
    setTestResult(null);
  };

  return (
    <div className="api-manager">
      {!showForm ? (
        // Exchange list
        <div className="exchanges-container">
          <div className="exchanges-header">
            <h2>Dine Børstilkoblinger</h2>
            <button className="add-exchange-btn" onClick={handleAddExchange}>
              <Plus size={16} />
              <span>Legg til tilkobling</span>
            </button>
          </div>
          
          {exchanges.length === 0 ? (
            <div className="no-exchanges">
              <p>Du har ingen børstilkoblinger ennå</p>
              <button className="add-exchange-btn" onClick={handleAddExchange}>
                <Plus size={16} />
                <span>Legg til din første børstilkobling</span>
              </button>
            </div>
          ) : (
            <div className="exchanges-list">
              {exchanges.map(exchange => (
                <div key={exchange._id} className="exchange-card">
                  <div className="exchange-header">
                    <div className="exchange-name">{exchange.name}</div>
                    <div className={`exchange-status ${exchange.isActive ? 'active' : 'inactive'}`}>
                      {exchange.isActive ? 'Aktiv' : 'Inaktiv'}
                    </div>
                  </div>
                  
                  <div className="exchange-details">
                    <div className="exchange-type">
                      <div className="detail-label">Børs:</div>
                      <div className="detail-value">{exchange.exchange.toUpperCase()}</div>
                    </div>
                    
                    <div className="exchange-api-key">
                      <div className="detail-label">API Nøkkel:</div>
                      <div className="detail-value masked-value">
                        ••••••••••••••••
                      </div>
                    </div>
                    
                    {exchange.credentials?.isPaper && (
                      <div className="exchange-paper">
                        <div className="detail-label">Modus:</div>
                        <div className="detail-value paper-tag">Paper Trading</div>
                      </div>
                    )}
                    
                    <div className="exchange-created">
                      <div className="detail-label">Opprettet:</div>
                      <div className="detail-value">
                        {new Date(exchange.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="exchange-actions">
                    <button 
                      className="action-btn edit-btn" 
                      onClick={() => handleEditExchange(exchange)}
                    >
                      <Edit size={14} />
                      <span>Rediger</span>
                    </button>
                    
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteExchange(exchange._id)}
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
      ) : (
        // Exchange form
        <div className="exchange-form-container">
          <div className="form-header">
            <h2>{editingExchange ? 'Rediger Børstilkobling' : 'Ny Børstilkobling'}</h2>
          </div>
          
          {error && (
            <div className="form-error">
              <XCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? (
                <CheckCircle size={16} />
              ) : (
                <XCircle size={16} />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
          
          <form className="exchange-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Navn på tilkobling *</label>
              <input 
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="f.eks. Binance Spot"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="exchange">Børs *</label>
              <select 
                id="exchange"
                name="exchange"
                value={formData.exchange}
                onChange={handleInputChange}
                required
              >
                <option value="binance">Binance</option>
                <option value="coinbase">Coinbase Pro</option>
                <option value="ftx">FTX</option>
                <option value="alpaca">Alpaca</option>
                <option value="tradingview">TradingView</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="apiKey">
                API Nøkkel {!editingExchange && '*'}
                {editingExchange && ' (La stå tom for å beholde gjeldende)'}
              </label>
              <div className="input-with-toggle">
                <input 
                  type={showSecrets.apiKey ? 'text' : 'password'}
                  id="apiKey"
                  name="apiKey"
                  value={formData.apiKey}
                  onChange={handleInputChange}
                  placeholder={editingExchange ? '••••••••••••••••' : 'Din API nøkkel'}
                  required={!editingExchange}
                />
                <button 
                  type="button" 
                  className="toggle-visibility"
                  onClick={() => toggleSecretVisibility('apiKey')}
                >
                  {showSecrets.apiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="secretKey">
                Secret Key {!editingExchange && '*'}
                {editingExchange && ' (La stå tom for å beholde gjeldende)'}
              </label>
              <div className="input-with-toggle">
                <input 
                  type={showSecrets.secretKey ? 'text' : 'password'}
                  id="secretKey"
                  name="secretKey"
                  value={formData.secretKey}
                  onChange={handleInputChange}
                  placeholder={editingExchange ? '••••••••••••••••' : 'Din secret key'}
                  required={!editingExchange}
                />
                <button 
                  type="button" 
                  className="toggle-visibility"
                  onClick={() => toggleSecretVisibility('secretKey')}
                >
                  {showSecrets.secretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            {formData.exchange === 'coinbase' && (
              <div className="form-group">
                <label htmlFor="passphrase">Passphrase</label>
                <div className="input-with-toggle">
                  <input 
                    type={showSecrets.passphrase ? 'text' : 'password'}
                    id="passphrase"
                    name="passphrase"
                    value={formData.passphrase}
                    onChange={handleInputChange}
                    placeholder={editingExchange ? '••••••••••••••••' : 'Din passphrase'}
                  />
                  <button 
                    type="button" 
                    className="toggle-visibility"
                    onClick={() => toggleSecretVisibility('passphrase')}
                  >
                    {showSecrets.passphrase ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            
            {formData.exchange === 'ftx' && (
              <div className="form-group">
                <label htmlFor="subaccount">Subaccount (valgfritt)</label>
                <input 
                  type="text"
                  id="subaccount"
                  name="subaccount"
                  value={formData.subaccount}
                  onChange={handleInputChange}
                  placeholder="Navn på subaccount"
                />
              </div>
            )}
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  name="isPaper"
                  checked={formData.isPaper}
                  onChange={handleInputChange}
                />
                <span>Paper Trading (testkonto)</span>
              </label>
              <div className="checkbox-help">
                Velg dette hvis du bruker en testkonto eller vil simulere handler uten å risikere ekte penger
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="test-btn"
                onClick={handleTestConnection}
                disabled={testing || loading || !formData.apiKey || !formData.secretKey}
              >
                {testing ? 'Tester...' : 'Test Tilkobling'}
              </button>
              
              <div className="form-buttons">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={handleCancel}
                >
                  Avbryt
                </button>
                
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Lagrer...' : 'Lagre'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default APIManager;
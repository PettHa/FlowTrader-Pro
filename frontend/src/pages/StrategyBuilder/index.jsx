import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play } from 'lucide-react';

// Import hovedkomponenten for strategibyggeren
import VisualStrategyBuilder from '../../components/builder/VisualStrategyBuilder';

// API-kall
import { getStrategy, updateStrategy } from '../../api/strategyApi';

// Styles
import './styles.css';

const StrategyBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Hent strategi-data
  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        setLoading(true);
        const response = await getStrategy(id);
        setStrategy(response.data);
        setError(null);
      } catch (err) {
        console.error('Feil ved henting av strategi:', err);
        setError('Kunne ikke laste strategien. Vennligst prøv igjen.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStrategy();
    } else {
      setLoading(false);
    }
  }, [id]);

  // Håndter lagring av strategi
  const handleSaveStrategy = async (strategyData) => {
    try {
      setSaving(true);
      await updateStrategy(id, {
        flowData: strategyData.flow,
        name: strategyData.metadata?.name || strategy.name,
      });
      setSaving(false);
      
      // Vis bekreftelsesmelding
      // I produksjon ville du kanskje brukt en Toast-komponent
      alert('Strategien ble lagret');
    } catch (err) {
      console.error('Feil ved lagring av strategi:', err);
      setSaving(false);
      setError('Kunne ikke lagre strategien. Vennligst prøv igjen.');
    }
  };

  // Naviger til backtest-siden
  const handleGoToBacktest = () => {
    navigate(`/strategy/${id}/backtest`);
  };

  // Naviger tilbake til strategi-oversikten
  const handleGoBack = () => {
    navigate('/strategies');
  };

  if (loading) {
    return <div className="loading-container">Laster strategi...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={handleGoBack}>
          Tilbake til strategier
        </button>
      </div>
    );
  }

  return (
    <div className="strategy-builder-page">
      <div className="page-header">
        <button className="btn btn-icon" onClick={handleGoBack}>
          <ArrowLeft size={16} />
          <span>Tilbake</span>
        </button>
        
        <h1 className="page-title">
          {strategy ? `Redigerer: ${strategy.name}` : 'Ny strategi'}
        </h1>
        
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleGoToBacktest}
            disabled={saving}
          >
            <Play size={16} />
            <span>Til Backtest</span>
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleSaveStrategy}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Lagrer...' : 'Lagre'}</span>
          </button>
        </div>
      </div>
      
      <div className="strategy-builder-container">
        <VisualStrategyBuilder 
          initialStrategy={strategy?.flowData} 
          onSave={handleSaveStrategy}
          strategyName={strategy?.name || 'Ny strategi'}
        />
      </div>
    </div>
  );
};

export default StrategyBuilderPage;
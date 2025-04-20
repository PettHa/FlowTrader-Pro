// frontend/src/pages/StrategyBuilder/index.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, BarChart2, AlertCircle, RefreshCw } from 'lucide-react';

// Import hovedkomponenten for strategibyggeren
import VisualStrategyBuilder from '../../components/builder/VisualStrategyBuilder';

// API-kall
import { getStrategy, updateStrategy, createStrategy } from '../../api/strategyApi';

// Styles
import './styles.css';

// En standard tom flow for nye strategier
const defaultNewStrategyFlow = {
  nodes: [
    { id: 'price', type: 'priceNode', data: { label: 'Market Data' }, position: { x: 50, y: 150 }, deletable: false },
  ],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const StrategyBuilderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState(null);
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [initialFlow, setInitialFlow] = useState(null); // Renamed from currentFlow for clarity
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isNewStrategy = id === 'new';
  const reactFlowInstanceRef = useRef(null); // Ref for React Flow instance

  // Hent strategi-data eller initialiser for ny
  useEffect(() => {
    const fetchStrategy = async () => {
      if (isNewStrategy) {
        setStrategyName('Ny Strategi');
        setStrategyDescription('');
        setInitialFlow(defaultNewStrategyFlow);
        setStrategy(null);
        setLoading(false);
        setError(null);
      } else {
        try {
          setLoading(true);
          const response = await getStrategy(id);
          setStrategy(response.data);
          setStrategyName(response.data.name || '');
          setStrategyDescription(response.data.description || '');
          setInitialFlow(response.data.flowData || defaultNewStrategyFlow); // Use default if flowData is missing
          setError(null);
        } catch (err) {
          console.error('Feil ved henting av strategi:', err);
          setError('Kunne ikke laste strategien. Vennligst prøv igjen.');
          setStrategy(null);
          setInitialFlow(null);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStrategy();
  }, [id, isNewStrategy]);

  // Callback function to be passed to the builder to get the instance
  const handleBuilderInit = useCallback((instance) => {
    reactFlowInstanceRef.current = instance;
    console.log("React Flow instance captured:", instance);
  }, []);

  // Håndter lagring av strategi (både ny og oppdatering)
  const handleSaveStrategy = useCallback(async () => {
    setError(null); // Nullstill feil ved nytt forsøk

    // Hent den *nåværende* flyten fra React Flow instansen
    if (!reactFlowInstanceRef.current) {
      setError("Strategibyggeren er ikke klar. Vent et øyeblikk og prøv igjen.");
      console.error("React Flow instance ref is not set.");
      return;
    }

    // Get the current flow state
    const latestFlow = reactFlowInstanceRef.current.toObject();

    // Fjern dynamisk beregnede headere før lagring
    latestFlow.nodes = latestFlow.nodes.map(node => {
        const { calculatedHeader, ...restData } = node.data || {};
        return { ...node, data: restData };
    });

    // Validering
    if (!strategyName.trim()) {
        setError('Strateginavn kan ikke være tomt.');
        return;
    }
    // Check node count (at least one node besides 'price')
    if (!latestFlow || !latestFlow.nodes || latestFlow.nodes.length <= 1) {
        setError('Strategien må inneholde minst én node i tillegg til Market Data.');
        return;
    }

    console.log("Payload to save:", { name: strategyName, description: strategyDescription, flowData: latestFlow }); // Debug log

    try {
      setSaving(true);

      const strategyDataPayload = {
        name: strategyName,
        description: strategyDescription,
        flowData: latestFlow, // Bruk den sist hentede flyten
      };

      let savedStrategy;
      if (isNewStrategy) {
        console.log("Creating new strategy...");
        const response = await createStrategy(strategyDataPayload);
        savedStrategy = response.data;
        console.log("Strategy created:", savedStrategy);
        // Naviger til den nye strategiens redigeringsside (med den faktiske IDen)
        navigate(`/strategy/${savedStrategy._id}/builder`, { replace: true });
        alert('Ny strategi opprettet!');
      } else {
        console.log(`Updating strategy ${id}...`);
        const response = await updateStrategy(id, strategyDataPayload);
        savedStrategy = response.data;
        console.log("Strategy updated:", savedStrategy);
        alert('Strategien ble lagret');
      }
      // Update local state after successful save
      setStrategy(savedStrategy);
      setInitialFlow(savedStrategy.flowData); // Update initial flow in case user stays on page

    } catch (err) {
      console.error('Feil ved lagring av strategi:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Kunne ikke lagre strategien. Sjekk konsollen for detaljer.';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  }, [id, isNewStrategy, strategyName, strategyDescription, navigate]); // Added dependencies

  // Naviger til backtest-siden
  const handleGoToBacktest = useCallback(() => {
    if (isNewStrategy) {
        alert("Du må lagre strategien før du kan kjøre backtest.");
        return;
    }
    // TODO: Warn about unsaved changes? Maybe save before navigating?
    // handleSaveStrategy().then(() => navigate(`/strategy/${id}/backtest`)); // Example: Save first
    navigate(`/strategy/${id}/backtest`);
  }, [id, isNewStrategy, navigate]); // Removed handleSaveStrategy dependency to avoid loop if used

  // Naviger tilbake
  const handleGoBack = useCallback(() => {
    // TODO: Warn about unsaved changes?
    if (!isNewStrategy && strategy) {
      navigate(`/strategy/${id}`);
    } else {
      navigate('/strategies');
    }
  }, [id, isNewStrategy, strategy, navigate]);

  // Loading og Error states
  if (loading) {
    return (
        <div className="loading-container">
            <RefreshCw size={32} className="animate-spin" />
            <p>Laster strategibygger...</p>
        </div>
    );
  }

  const loadingError = error && !initialFlow && !isNewStrategy;

  if (loadingError) {
    return (
      <div className="error-container">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={handleGoBack}>
          Tilbake
        </button>
      </div>
    );
  }

  // Render selve siden
  return (
    <div className="strategy-builder-page">
      <div className="page-header">
        <button className="btn btn-icon" onClick={handleGoBack} title="Tilbake">
          <ArrowLeft size={16} />
        </button>

        <div className="strategy-name-input-container">
          <input
            type="text"
            className="strategy-name-input"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            placeholder="Gi strategien et navn..."
            disabled={saving}
            aria-label="Strateginavn"
          />
        </div>

        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={handleGoToBacktest}
            disabled={saving || isNewStrategy}
            title={isNewStrategy ? "Lagre strategien først" : "Gå til Backtest"}
          >
            <BarChart2 size={16} />
            <span>Backtest</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSaveStrategy}
            disabled={saving || !strategyName.trim()}
            title={!strategyName.trim() ? "Strateginavn kan ikke være tomt" : (isNewStrategy ? "Opprett Strategi" : "Lagre Endringer")}
          >
            <Save size={16} />
            <span>{saving ? 'Lagrer...' : (isNewStrategy ? 'Opprett' : 'Lagre')}</span>
          </button>
        </div>
      </div>

       <div className="strategy-description-input-container">
           <input
               type="text"
               className="strategy-description-input"
               value={strategyDescription}
               onChange={(e) => setStrategyDescription(e.target.value)}
               placeholder="Legg til en kort beskrivelse (valgfritt)..."
               disabled={saving}
               aria-label="Strategibeskrivelse"
           />
       </div>

       {/* Display saving/validation errors here */}
        {error && !loadingError && ( // Only show non-loading errors
            <div className="alert error" style={{ margin: '0 1.5rem 1rem 1.5rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
            </div>
        )}

      <div className="strategy-builder-container">
        {initialFlow ? ( // Check if initialFlow is ready before rendering builder
          <VisualStrategyBuilder
            key={id} // Force re-mount if id changes
            initialStrategy={initialFlow} // Pass the initial flow data
            strategyName={strategyName}
            onBuilderInit={handleBuilderInit} // Pass the callback function
          />
        ) : (
             <div className="loading-container">Initialiserer bygger...</div>
        )}
      </div>
    </div>
  );
};

export default StrategyBuilderPage;
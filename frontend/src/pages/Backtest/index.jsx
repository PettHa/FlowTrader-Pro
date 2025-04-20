import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, FileDown } from 'lucide-react';

// Import komponenter
import BacktestPanel from '../../components/backtest/BacktestPanel';
// ResultsViewer vil vises når backtest er ferdig
import ResultsViewer from '../../components/backtest/ResultsViewer';

// API-kall
import { getStrategy } from '../../api/strategyApi';
import { runBacktest, getBacktestResults } from '../../api/backtestApi';

// Styles
import './styles.css';

const BacktestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [strategy, setStrategy] = useState(null);
  const [backtestResults, setBacktestResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  // Hent strategi og tidligere backtestresultater
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Hent strategi
        const strategyResponse = await getStrategy(id);
        setStrategy(strategyResponse.data);
        
        // Hent tidligere backtest-resultater
        const resultsResponse = await getBacktestResults(id);
        setBacktestResults(resultsResponse.data);
        
        // Velg det nyeste resultatet som standard hvis det finnes
        if (resultsResponse.data.length > 0) {
          setSelectedResult(resultsResponse.data[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Feil ved henting av data:', err);
        setError('Kunne ikke laste strategien eller backtest-resultatene.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Kjør backtest
  const handleRunBacktest = async (backtestParams) => {
    try {
      setRunning(true);
      setError(null);
      
      // Kjør backtest
      const response = await runBacktest(id, backtestParams);
      
      // Legg til det nye resultatet i listen og velg det
      setBacktestResults(prev => [response.data, ...prev]);
      setSelectedResult(response.data);
      
      setRunning(false);
    } catch (err) {
      console.error('Feil ved kjøring av backtest:', err);
      setRunning(false);
      setError('Kunne ikke kjøre backtest. Vennligst prøv igjen.');
    }
  };

  // Velg et resultat å vise
  const handleSelectResult = (resultId) => {
    const result = backtestResults.find(r => r._id === resultId);
    if (result) {
      setSelectedResult(result);
    }
  };

  // Last ned rapport
  const handleDownloadReport = () => {
    if (!selectedResult) return;
    
    // I et faktisk prosjekt ville dette kalt en API for å generere en PDF/Excel
    // Her viser vi bare hvordan det kan struktureres
    alert('Last ned rapport - vil være implementert med ekte API');
  };

  // Naviger til strategi-builder
  const handleGoToBuilder = () => {
    navigate(`/strategy/${id}/builder`);
  };

  // Naviger til live trading
  const handleGoToLiveTrading = () => {
    navigate(`/strategy/${id}/live`);
  };

  // Naviger tilbake til strategi-detaljer
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
    <div className="backtest-page">
      <div className="page-header">
        <button className="btn btn-icon" onClick={handleGoBack}>
          <ArrowLeft size={16} />
          <span>Tilbake</span>
        </button>
        
        <h1 className="page-title">
          {strategy ? `Backtest: ${strategy.name}` : 'Backtest'}
        </h1>
        
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleGoToBuilder}
          >
            <span>Endre Strategi</span>
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleGoToLiveTrading}
            disabled={!selectedResult} // Kan bare gå til live hvis du har et gyldig resultat
          >
            <Play size={16} />
            <span>Til Live Trading</span>
          </button>
        </div>
      </div>
      
      <div className="backtest-container">
        <div className="backtest-panel-container">
          <BacktestPanel 
            onRunBacktest={handleRunBacktest} 
            isRunning={running}
            strategy={strategy}
          />
        </div>
        
        {selectedResult && (
          <div className="backtest-results-container">
            <div className="results-header">
              <h2>Backtest Resultat</h2>
              <button 
                className="btn btn-secondary"
                onClick={handleDownloadReport}
              >
                <FileDown size={16} />
                <span>Last ned Rapport</span>
              </button>
            </div>
            
            <ResultsViewer result={selectedResult} />
            
            {backtestResults.length > 1 && (
              <div className="results-history">
                <h3>Tidligere Backtests</h3>
                <div className="results-list">
                  {backtestResults.map(result => (
                    <div 
                      key={result._id} 
                      className={`result-item ${selectedResult._id === result._id ? 'active' : ''}`}
                      onClick={() => handleSelectResult(result._id)}
                    >
                      <div className="result-date">
                        {new Date(result.createdAt).toLocaleString()}
                      </div>
                      <div className="result-summary">
                        <span>Win Rate: {result.summary.winRate.toFixed(2)}%</span>
                        <span>Profit: {result.summary.finalEquity.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestPage;
// frontend/src/pages/Backtest/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
// --- FIX: Added Edit to the import ---
import { ArrowLeft, Save, Play, FileDown, BarChart2, RefreshCw, AlertCircle, Edit } from 'lucide-react'; // Added icons

// Import komponenter
import BacktestPanel from '../../components/backtest/BacktestPanel';
import ResultsViewer from '../../components/backtest/ResultsViewer';

// API-kall
import { getStrategy } from '../../api/strategyApi';
import { runBacktest, getBacktestResults, getBacktestResult } from '../../api/backtestApi'; // Added getBacktestResult

// Styles
import './styles.css';

const BacktestPage = () => {
  const { id: strategyId } = useParams(); // Rename id to strategyId for clarity
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // To handle selected result ID in URL

  const [strategy, setStrategy] = useState(null);
  const [allBacktestResults, setAllBacktestResults] = useState([]); // Store all results fetched
  const [selectedResult, setSelectedResult] = useState(null); // The result currently being viewed
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null); // Specific error during run
  const [loadError, setLoadError] = useState(null); // Error during initial load

  // Fetch strategy details first
  const fetchStrategyDetails = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const strategyResponse = await getStrategy(strategyId);
      setStrategy(strategyResponse.data);
      return strategyResponse.data; // Return strategy for chaining
    } catch (err) {
      console.error('Feil ved henting av strategi:', err);
      setLoadError('Kunne ikke laste strategien.');
      setStrategy(null);
      setAllBacktestResults([]);
      setSelectedResult(null);
      return null; // Indicate failure
    } finally {
       // Set loading false only after *all* initial data is potentially fetched
       // setLoading(false); // Moved loading false setting
    }
  }, [strategyId]);

  // Fetch backtest results (all for the list, and potentially a specific one)
  const fetchResults = useCallback(async () => {
    try {
      // Don't reset loading here, handled by fetchStrategyDetails
      const resultsResponse = await getBacktestResults(strategyId);
      const sortedResults = resultsResponse.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllBacktestResults(sortedResults);

      // Check if a specific result ID is requested in the URL
      const requestedResultId = searchParams.get('result');
      let resultToShow = null;

      if (requestedResultId) {
        // Attempt to find it in the list first
        resultToShow = sortedResults.find(r => r._id === requestedResultId);
        if (!resultToShow) {
           // If not in the list (e.g., direct link), try fetching it directly
           console.log(`Result ${requestedResultId} not in list, fetching directly...`);
           try {
               const specificResultResponse = await getBacktestResult(requestedResultId);
               resultToShow = specificResultResponse.data;
                // Add it to the list if fetched successfully (optional)
               // setAllBacktestResults(prev => [resultToShow, ...prev.filter(r => r._id !== requestedResultId)].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
           } catch (specificErr) {
                console.error(`Failed to fetch specific result ${requestedResultId}:`, specificErr);
                setLoadError(`Kunne ikke laste spesifikt backtest-resultat ${requestedResultId}. Viser siste.`);
                // Fallback to latest result if specific fetch fails
                resultToShow = sortedResults.length > 0 ? sortedResults[0] : null;
                // Update URL to remove invalid result ID
                setSearchParams({});
           }
        }
      } else if (sortedResults.length > 0) {
         // Default to the latest result if none is specified
         resultToShow = sortedResults[0];
      }

      setSelectedResult(resultToShow);

    } catch (err) {
      console.error('Feil ved henting av backtest-resultater:', err);
      setLoadError('Kunne ikke laste backtest-resultatene.');
      setAllBacktestResults([]);
      setSelectedResult(null);
    }
  }, [strategyId, searchParams, setSearchParams]); // Added dependencies


  // Initial data loading effect
  useEffect(() => {
    const loadInitialData = async () => {
      const strat = await fetchStrategyDetails();
      if (strat) { // Only fetch results if strategy loaded successfully
        await fetchResults();
      }
      setLoading(false); // Set loading false after all attempts
    };
    loadInitialData();
  }, [fetchStrategyDetails, fetchResults]); // Use the memoized functions


  // Run backtest handler
  const handleRunBacktest = useCallback(async (backtestParams) => {
    try {
      setRunning(true);
      setRunError(null); // Clear previous run errors
      setSelectedResult(null); // Clear previous result display while running

      console.log("Running backtest with params:", backtestParams);
      const response = await runBacktest(strategyId, backtestParams);
      console.log("Backtest completed, response data:", response.data);

      // Prepend the new result to the list and make it the selected one
      setAllBacktestResults(prev => [response.data, ...prev].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setSelectedResult(response.data);
      // Update URL to show the new result ID
      setSearchParams({ result: response.data._id });

    } catch (err) {
      console.error('Feil ved kjøring av backtest:', err);
      const errorMessage = err.response?.data?.error || 'Kunne ikke kjøre backtest. Sjekk konsollen for detaljer.';
      setRunError(errorMessage);
      setSelectedResult(null); // Ensure no partial/old result is shown on error
    } finally {
      setRunning(false);
    }
  }, [strategyId, setSearchParams]); // Added dependency


  // Select a result to view from the history list
  const handleSelectResult = useCallback((resultId) => {
    const result = allBacktestResults.find(r => r._id === resultId);
    if (result) {
      setSelectedResult(result);
      // Update URL to reflect the selected result
      setSearchParams({ result: resultId });
      setRunError(null); // Clear run error when selecting a valid result
    }
  }, [allBacktestResults, setSearchParams]);


  // Download report (placeholder)
  const handleDownloadReport = useCallback(() => {
    if (!selectedResult) return;
    // In a real app, generate a report (CSV/PDF) based on selectedResult data
    alert(`Nedlasting av rapport for resultat ${selectedResult._id} (ikke implementert)`);
    // Example: Create CSV data
    // const csvData = [["Metric", "Value"], ["Win Rate", selectedResult.summary.winRate], ...];
    // Code to generate and trigger download...
  }, [selectedResult]);


  // Navigation handlers
  const handleGoToBuilder = useCallback(() => navigate(`/strategy/${strategyId}/builder`), [navigate, strategyId]);
  const handleGoToLiveTrading = useCallback(() => navigate(`/strategy/${strategyId}/live`), [navigate, strategyId]);
  const handleGoBack = useCallback(() => navigate(`/strategy/${strategyId}`), [navigate, strategyId]);


  // Render loading/error states
  if (loading) {
    return (
      <div className="loading-container">
        <RefreshCw size={32} className="animate-spin" />
        <p>Laster backtest-side...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="error-container">
        <AlertCircle size={24} />
        <p>{loadError}</p>
        <button className="btn btn-primary" onClick={() => navigate('/strategies')}>
          Tilbake til strategier
        </button>
      </div>
    );
  }

  // Main page render
  return (
    <div className="backtest-page">
      <div className="page-header">
        <button className="btn btn-icon" onClick={handleGoBack} title="Tilbake til strategi">
          <ArrowLeft size={16} />
          {/* <span>Tilbake</span> */}
        </button>

        <h1 className="page-title">
          {strategy ? `Backtest: ${strategy.name}` : 'Backtest'}
        </h1>

        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={handleGoToBuilder}
            title="Endre strategien"
          >
            {/* --- FIX: Used the imported Edit icon --- */}
            <Edit size={16} />
            <span>Endre Strategi</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleGoToLiveTrading}
            disabled={running} // Disable if backtest is running
            title="Gå til Live Trading for denne strategien"
          >
            <Play size={16} />
            <span>Til Live Trading</span>
          </button>
        </div>
      </div>

      {runError && (
          <div className="alert error backtest-run-error">
            <AlertCircle size={16} />
            <span>Feil under kjøring av backtest: {runError}</span>
          </div>
      )}

      <div className="backtest-content-wrapper">
        {/* Left Panel: Configuration and History */}
        <div className="backtest-sidebar">
          <div className="backtest-panel-container">
            <BacktestPanel
              onRunBacktest={handleRunBacktest}
              isRunning={running}
              strategy={strategy} // Pass strategy data to panel
            />
          </div>

          {allBacktestResults.length > 0 && (
            <div className="results-history">
              <h3>Backtest Historikk</h3>
              <div className="results-list">
                {allBacktestResults.map(result => (
                  <div
                    key={result._id}
                    className={`result-item ${selectedResult?._id === result._id ? 'active' : ''}`}
                    onClick={() => handleSelectResult(result._id)}
                    role="button" // Improve accessibility
                    tabIndex={0} // Improve accessibility
                    onKeyPress={(e) => e.key === 'Enter' && handleSelectResult(result._id)} // Improve accessibility
                  >
                    <div className="result-date">
                      {new Date(result.createdAt).toLocaleString()}
                    </div>
                    <div className="result-market">
                      {result.market.exchange}:{result.market.symbol} ({result.market.timeframe})
                    </div>
                    <div className="result-summary">
                      <span>WR: {result.summary.winRate?.toFixed(1) ?? 'N/A'}%</span>
                      <span className={result.summary.annualReturn >= 0 ? 'profit' : 'loss'}>
                          Ret: {result.summary.annualReturn?.toFixed(1) ?? 'N/A'}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Results Viewer */}
        <div className="backtest-results-container">
          {running && (
            <div className="loading-overlay">
              <RefreshCw size={32} className="animate-spin" />
              <p>Kjører backtest...</p>
            </div>
          )}
          {!running && selectedResult && (
            <>
              <div className="results-header">
                <h2>Resultater ({new Date(selectedResult.createdAt).toLocaleDateString()})</h2>
                <button
                  className="btn btn-secondary"
                  onClick={handleDownloadReport}
                  title="Last ned rapport (CSV/PDF - ikke implementert)"
                >
                  <FileDown size={16} />
                  <span>Last ned Rapport</span>
                </button>
              </div>
              <ResultsViewer result={selectedResult} />
            </>
          )}
           {!running && !selectedResult && !runError && (
                <div className="no-results-placeholder">
                    <p>Velg en backtest fra historikken eller kjør en ny backtest for å se resultater.</p>
                </div>
           )}
        </div>
      </div>
    </div>
  );
};

// --- Minimal CSS for nye elementer (legg til i styles.css) ---
/*

*/

export default BacktestPage;
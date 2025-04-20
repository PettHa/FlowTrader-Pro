// frontend/src/pages/Settings/index.jsx
import React, { useState } from 'react';
import { Save, Bell, Lock, Shield, Monitor, CheckCircle, AlertCircle } from 'lucide-react';

import './styles.css'; // Pass på at denne filen finnes og har relevant CSS

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // General settings
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('no');
  const [timeFormat, setTimeFormat] = useState('24h');
  // TODO: Legg til state for handelspreferanser hvis de skal lagres
  // const [defaultLeverage, setDefaultLeverage] = useState('1');
  // const [riskPerTrade, setRiskPerTrade] = useState('1');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(true);
  const [backtestAlerts, setBacktestAlerts] = useState(true);
  const [marketAlerts, setMarketAlerts] = useState(false);

  // Security settings
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  // TODO: Legg til state for passordendring hvis det skal implementeres
  // const [currentPassword, setCurrentPassword] = useState('');
  // const [newPassword, setNewPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Nullstill feil ved nytt forsøk
    setSuccess(false); // Nullstill suksess ved nytt forsøk

    // TODO: Implement faktisk API-kall her for å lagre innstillingene
    // Samle innstillinger basert på aktiv fane eller alle sammen
    const settingsData = {
      // Eksempel på data som kan sendes
      general: { theme, language, timeFormat /*, defaultLeverage, riskPerTrade */ },
      notifications: { emailNotifications, tradeAlerts, backtestAlerts, marketAlerts },
      security: { twoFactor, sessionTimeout }
    };
    console.log("Saving settings:", settingsData); // For debugging

    // Simulate API call
    setTimeout(() => {
        // Simulert suksess/feil
        const didSucceed = Math.random() > 0.1; // 90% sjanse for suksess

        setLoading(false);
        if (didSucceed) {
            setSuccess(true);
            // Gjem suksessmelding etter 3 sekunder
            setTimeout(() => {
                setSuccess(false);
            }, 3000);
        } else {
            setError("Kunne ikke lagre innstillingene. Prøv igjen.");
             // Gjem feilmelding etter 5 sekunder
             setTimeout(() => {
                setError(null);
            }, 5000);
        }
    }, 1000);
  };

  // --- Tab content components ---
  // Disse må defineres FØR return-statementet til SettingsPage

  const GeneralSettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="settings-section">
        <h3 className="section-title">Grensesnitt</h3>

        <div className="form-group">
          <label htmlFor="theme">Tema</label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="light">Lyst</option>
            <option value="dark">Mørkt</option>
            <option value="system">Systemvalg</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="language">Språk</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="no">Norsk</option>
            <option value="en">English</option>
            <option value="sv">Svenska</option>
            <option value="da">Dansk</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="timeFormat">Tidsformat</label>
          <select
            id="timeFormat"
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value)}
          >
            <option value="24h">24-timer (16:30)</option>
            <option value="12h">12-timer (4:30 PM)</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Handelspreferanser</h3>

        <div className="form-group">
          <label htmlFor="defaultLeverage">Standard giring</label>
          <select id="defaultLeverage" /* value={defaultLeverage} onChange={(e) => setDefaultLeverage(e.target.value)} */ >
            <option value="1">1x (Ingen giring)</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
          </select>
          <div className="form-help">Standardverdi for nye strategier</div>
        </div>

        <div className="form-group">
          <label htmlFor="riskPerTrade">Risiko per handel</label>
          <select id="riskPerTrade" /* value={riskPerTrade} onChange={(e) => setRiskPerTrade(e.target.value)} */ >
            <option value="0.5">0.5% av porteføljen</option>
            <option value="1">1% av porteføljen</option>
            <option value="2">2% av porteføljen</option>
            <option value="5">5% av porteføljen</option>
          </select>
          <div className="form-help">Standardverdi for nye strategier</div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          <Save size={16} />
          <span>{loading ? 'Lagrer...' : 'Lagre endringer'}</span>
        </button>
      </div>
    </form>
  );

  const NotificationSettings = () => (
    <form onSubmit={handleSaveSettings}>
      <div className="settings-section">
        <h3 className="section-title">E-postvarsler</h3>

        <div className="toggle-group">
          <div className="toggle-label">
            <label htmlFor="emailNotifications">E-postvarsler aktivert</label>
            <div className="form-help">Motta alle varsler på e-post</div>
          </div>
          <div className="toggle-control">
            <input
              type="checkbox"
              id="emailNotifications"
              className="toggle-checkbox"
              checked={emailNotifications}
              onChange={() => setEmailNotifications(!emailNotifications)}
            />
            <label htmlFor="emailNotifications" className="toggle-switch"></label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Varseltyper</h3>

        <div className="toggle-group">
          <div className="toggle-label">
            <label htmlFor="tradeAlerts">Handelsvarsler</label>
            <div className="form-help">Varsler om utførte handler og ordreutfyllinger</div>
          </div>
          <div className="toggle-control">
            <input
              type="checkbox"
              id="tradeAlerts"
              className="toggle-checkbox"
              checked={tradeAlerts}
              onChange={() => setTradeAlerts(!tradeAlerts)}
            />
            <label htmlFor="tradeAlerts" className="toggle-switch"></label>
          </div>
        </div>

        <div className="toggle-group">
          <div className="toggle-label">
            <label htmlFor="backtestAlerts">Backtest-varsler</label>
            <div className="form-help">Varsler når en backtest er fullført</div>
          </div>
          <div className="toggle-control">
            <input
              type="checkbox"
              id="backtestAlerts"
              className="toggle-checkbox"
              checked={backtestAlerts}
              onChange={() => setBacktestAlerts(!backtestAlerts)}
            />
            <label htmlFor="backtestAlerts" className="toggle-switch"></label>
          </div>
        </div>

        <div className="toggle-group">
          <div className="toggle-label">
            <label htmlFor="marketAlerts">Markedsvarsler</label>
            <div className="form-help">Varsler om markedshendelser som store prisendringer</div>
          </div>
          <div className="toggle-control">
            <input
              type="checkbox"
              id="marketAlerts"
              className="toggle-checkbox"
              checked={marketAlerts}
              onChange={() => setMarketAlerts(!marketAlerts)}
            />
            <label htmlFor="marketAlerts" className="toggle-switch"></label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          <Save size={16} />
          <span>{loading ? 'Lagrer...' : 'Lagre endringer'}</span>
        </button>
      </div>
    </form>
  );

  const SecuritySettings = () => {
    // TODO: Implement password change logic if needed
    const handleChangePassword = (e) => {
        e.preventDefault();
        console.log("Password change requested...");
        // Add validation and API call here
        alert("Funksjonalitet for passordendring er ikke implementert.");
    };

    // TODO: Implement delete account logic if needed
    const handleDeleteAccount = () => {
        console.log("Delete account requested...");
        if (window.confirm("Er du sikker på at du vil slette kontoen din? Dette kan ikke angres.")) {
             if (window.confirm("Vennligst bekreft: Vil du permanent slette kontoen og alle data?")) {
                alert("Funksjonalitet for kontosletting er ikke implementert.");
                // Add API call here
             }
        }
    };

    return (
        // Bruker ikke handleSaveSettings her med mindre lagring av 2FA/Timeout skal skje via hovedknappen
        // Kanskje passord og sletting skal ha egne knapper/API-kall
        <form>
          <div className="settings-section">
            <h3 className="section-title">Kontosikkerhet</h3>

            <div className="toggle-group">
              <div className="toggle-label">
                <label htmlFor="twoFactor">To-faktor autentisering</label>
                <div className="form-help">Krev en engangskode i tillegg til passord ved innlogging</div>
              </div>
              <div className="toggle-control">
                <input
                  type="checkbox"
                  id="twoFactor"
                  className="toggle-checkbox"
                  checked={twoFactor}
                  onChange={() => setTwoFactor(!twoFactor)}
                />
                <label htmlFor="twoFactor" className="toggle-switch"></label>
              </div>
            </div>

            {twoFactor && (
              <div className="sub-section">
                <button type="button" className="btn btn-secondary">
                  Sett opp to-faktor autentisering {/* TODO: Implement 2FA setup flow */}
                </button>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="sessionTimeout">Tidsgrense for økt</label>
              <select
                id="sessionTimeout"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
              >
                <option value="15">15 minutter</option>
                <option value="30">30 minutter</option>
                <option value="60">1 time</option>
                <option value="120">2 timer</option>
                <option value="240">4 timer</option>
              </select>
              <div className="form-help">Tid før automatisk utlogging ved inaktivitet</div>
            </div>
             {/* Knappen under lagrer bare 2FA og Timeout hvis den submiter formen med handleSaveSettings */}
             <div className="form-actions">
                <button
                  type="button" // Endret til button for å unngå default submit, eller bruk onSubmit={handleSaveSettings} på formen
                  className="btn btn-primary"
                  onClick={handleSaveSettings} // Manuell trigger for lagring
                  disabled={loading}
                >
                  <Save size={16} />
                  <span>{loading ? 'Lagrer...' : 'Lagre Sikkerhetsinnstillinger'}</span>
                </button>
            </div>
          </div>


          {/* Separert form for passordendring */}
          <form onSubmit={handleChangePassword}>
              <div className="settings-section">
                <h3 className="section-title">Endre passord</h3>

                <div className="form-group">
                  <label htmlFor="currentPassword">Nåværende passord</label>
                  <input type="password" id="currentPassword" required /* value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} */ />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Nytt passord</label>
                  <input type="password" id="newPassword" required /* value={newPassword} onChange={(e) => setNewPassword(e.target.value)} */ />
                  <div className="form-help">Minst 8 tegn med kombinasjon av bokstaver, tall og spesialtegn</div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Bekreft passord</label>
                  <input type="password" id="confirmPassword" required /* value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} */ />
                </div>

                <div className="form-actions-inline">
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    // disabled={loadingPasswordChange} // Trenger egen loading state
                  >
                    Endre passord
                  </button>
                </div>
              </div>
          </form>


          <div className="settings-section danger-section">
            <h3 className="section-title">Faresone</h3>

            <div className="danger-action">
              <div className="danger-info">
                <h4>Slett konto</h4>
                <p>Ved sletting vil alle dine data, strategier og innstillinger permanent fjernes.</p>
              </div>
              <button type="button" className="btn btn-danger" onClick={handleDeleteAccount}>
                  Slett min konto
              </button>
            </div>
          </div>
        </form> // Denne form-taggen er kanskje overflødig hvis ikke hovedknappen skal lagre noe her
    );
  }

  // --- Hoved-render for SettingsPage ---
  // Return-statementet må komme ETTER definisjonene over
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Innstillinger</h1>
      </div>

      {/* Flyttet alerts til toppen for bedre synlighet */}
      {success && (
        <div className="alert success">
          <CheckCircle size={16} />
          <span>Innstillingene ble lagret</span>
        </div>
      )}

      {error && (
        <div className="alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="settings-container">
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Monitor size={18} />
            <span>Generelt</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} />
            <span>Varsler</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} />
            <span>Sikkerhet</span>
          </button>
          {/* TODO: Legg til flere faner her om nødvendig */}
        </div>

        <div className="settings-content">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
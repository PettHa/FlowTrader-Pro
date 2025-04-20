import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';

// API calls - Sørg for at denne stien er korrekt relativt til src/pages/
// Hvis authApi.js er i src/api/, er ../../api/authApi korrekt.
import { forgotPassword } from '../../api/authApi';

// Gjenbruk stiler fra Login-siden - Sørg for at stien er korrekt
// Hvis styles.css er i src/pages/Login/, er ../Login/styles.css korrekt.
import '../Login/styles.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Vennligst oppgi e-postadressen din');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false); // Reset success state on new submission

      await forgotPassword(email);

      // Show success message
      setSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || 'Kunne ikke sende tilbakestillingslenke. Vennligst prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page"> {/* Bruker login-page klassenavn som spesifisert i import */}
      <div className="auth-form-container">
        <h1 className="auth-title">Glemt passord</h1>
        <p className="auth-subtitle">Oppgi e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet</p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="auth-success">
            <CheckCircle size={16} />
            <div>
              <p>Vi har sendt en e-post med instruksjoner for å tilbakestille passordet ditt.</p>
              <p>Sjekk innboksen din og følg instruksjonene i e-posten.</p>
              <div className="auth-alternative" style={{ marginTop: '1.5rem' }}>
                <Link to="/auth/login" className="auth-link">
                  Tilbake til innlogging
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">E-post</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  id="email"
                  placeholder="navn@eksempel.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="E-postadresse for tilbakestilling av passord"
                />
              </div>
            </div>

            <div className="form-group">
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Sender...' : 'Send tilbakestillingslenke'}
              </button>
            </div>

            <div className="auth-alternative">
              <Link to="/auth/login" className="auth-link">
                Tilbake til innlogging
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
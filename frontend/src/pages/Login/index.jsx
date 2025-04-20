import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';

// API calls
import { login } from '../../api/authApi';

import './styles.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we have a session expired message
  const sessionExpired = new URLSearchParams(location.search).get('session') === 'expired';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Vennligst fyll ut alle feltene');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await login(email, password);
      
      // Store token
      localStorage.setItem('token', response.token);
      
      // Redirect to dashboard or previous page
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Innlogging feilet. Vennligst prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {sessionExpired && (
        <div className="session-expired-alert">
          <AlertCircle size={16} />
          <span>Din økt har utløpt. Vennligst logg inn på nytt.</span>
        </div>
      )}
      
      <div className="auth-form-container">
        <h1 className="auth-title">Logg inn</h1>
        <p className="auth-subtitle">Logg inn for å få tilgang til FlowTrader</p>
        
        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        
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
              />
            </div>
          </div>
          
          <div className="form-group">
            <div className="label-with-link">
              <label htmlFor="password">Passord</label>
              <Link to="/auth/forgot-password" className="forgot-password">
                Glemt passord?
              </Link>
            </div>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                id="password"
                placeholder="Ditt passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </div>
        </form>
        
        <div className="auth-alternative">
          <span>Har du ikke en konto?</span>
          <Link to="/auth/register" className="auth-link">
            Registrer deg
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
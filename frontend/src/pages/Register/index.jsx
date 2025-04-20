import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, AlertCircle } from 'lucide-react';

// API calls
import { register } from '../../api/authApi';

import '../Login/styles.css'; // Reuse the login page styles

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Vennligst fyll ut alle feltene');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens');
      return;
    }
    
    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await register(name, email, password);
      
      // Store token
      localStorage.setItem('token', response.token);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registrering feilet. Vennligst prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-form-container">
        <h1 className="auth-title">Opprett konto</h1>
        <p className="auth-subtitle">Registrer deg for å få tilgang til FlowTrader</p>
        
        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Navn</label>
            <div className="input-with-icon">
              <User size={18} />
              <input
                type="text"
                id="name"
                placeholder="Ditt navn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          
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
            <label htmlFor="password">Passord</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                id="password"
                placeholder="Minst 8 tegn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Bekreft passord</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                id="confirmPassword"
                placeholder="Gjenta passord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Registrerer...' : 'Registrer deg'}
            </button>
          </div>
        </form>
        
        <div className="auth-alternative">
          <span>Har du allerede en konto?</span>
          <Link to="/auth/login" className="auth-link">
            Logg inn
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
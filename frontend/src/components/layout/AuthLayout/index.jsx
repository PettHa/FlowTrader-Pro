import React from 'react';
import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';

import './styles.css';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-sidebar">
          <div className="auth-brand">
            <Zap size={32} className="brand-icon" />
            <h1 className="brand-name">FlowTrader</h1>
          </div>
          
          <div className="auth-features">
            <h2>Kom i gang med trading</h2>
            <p>
              FlowTrader gir deg verktøyene til å bygge, teste og kjøre 
              handelsstrategier med en visuell, kodingsfri tilnærming.
            </p>
            
            <ul className="feature-list">
              <li>Visuell strategibygging</li>
              <li>Omfattende backtesting</li>
              <li>Automatisert trading</li>
              <li>Tilkobling til ledende børser</li>
              <li>Detaljert handelsanalyse</li>
            </ul>
          </div>
          
          <div className="auth-footer">
            <p>&copy; 2025 FlowTrader. Alle rettigheter reservert.</p>
          </div>
        </div>
        
        <div className="auth-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
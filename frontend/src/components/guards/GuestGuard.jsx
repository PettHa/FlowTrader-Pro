import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Loader } from 'lucide-react';

// Auth context (You would implement this separately)
import { useAuth } from '../../hooks/useAuth';

// API
import { getProfile } from '../../api/authApi';

const GuestGuard = ({ children }) => {
  const { isAuthenticated, setIsAuthenticated, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        // Validate token by fetching user profile
        const response = await getProfile();
        
        // If successful, set authenticated and store user
        setIsAuthenticated(true);
        setUser(response.data);
      } catch (error) {
        console.error('Authentication error:', error);
        setIsAuthenticated(false);
        
        // Clear invalid token
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setIsAuthenticated, setUser]);

  if (loading) {
    return (
      <div className="auth-loading">
        <Loader size={32} className="animate-spin" />
        <p>Laster inn...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    // use state.from if available, otherwise use dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

GuestGuard.propTypes = {
  children: PropTypes.node.isRequired
};

export default GuestGuard;
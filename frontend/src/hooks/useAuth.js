import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook that provides access to the Auth context
 * @returns {Object} Auth context values
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default useAuth;
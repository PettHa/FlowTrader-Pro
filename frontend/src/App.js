import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useRoutes } from 'react-router-dom';

// Import routes
import routes from './routes';

// Import styles
import './App.css';

const App = () => {
  const content = useRoutes(routes);

  return content;
};

const AppWithRouter = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWithRouter;
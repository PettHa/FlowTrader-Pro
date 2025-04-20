import React from 'react';
import { Navigate } from 'react-router-dom';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword/ForgotPassword';

// Main Pages
import DashboardPage from './pages/Dashboard';
import StrategiesPage from './pages/Strategies';
import StrategyDetailsPage from './pages/StrategyDetails';
import StrategyBuilderPage from './pages/StrategyBuilder';
import BacktestPage from './pages/Backtest';
import LiveTradingPage from './pages/LiveTrading';
import SettingsPage from './pages/Settings';
import APIManagerPage from './pages/APIManager';
import ProfilePage from './pages/Profile';

// Guards
import AuthGuard from './components/guards/AuthGuard';
import GuestGuard from './components/guards/GuestGuard';

// Routes configuration
const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: (
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        )
      },
      {
        path: 'strategies',
        element: (
          <AuthGuard>
            <StrategiesPage />
          </AuthGuard>
        )
      },
      {
        path: 'strategy',
        children: [
          {
            path: '',
            element: <Navigate to="/strategies" replace />
          },
          {
            path: ':id',
            element: (
              <AuthGuard>
                <StrategyDetailsPage />
              </AuthGuard>
            )
          },
          {
            path: ':id/builder',
            element: (
              <AuthGuard>
                <StrategyBuilderPage />
              </AuthGuard>
            )
          },
          {
            path: ':id/backtest',
            element: (
              <AuthGuard>
                <BacktestPage />
              </AuthGuard>
            )
          },
          {
            path: ':id/live',
            element: (
              <AuthGuard>
                <LiveTradingPage />
              </AuthGuard>
            )
          }
        ]
      },
      {
        path: 'settings',
        element: (
          <AuthGuard>
            <SettingsPage />
          </AuthGuard>
        )
      },
      {
        path: 'api-manager',
        element: (
          <AuthGuard>
            <APIManagerPage />
          </AuthGuard>
        )
      },
      {
        path: 'profile',
        element: (
          <AuthGuard>
            <ProfilePage />
          </AuthGuard>
        )
      }
    ]
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        )
      },
      {
        path: 'register',
        element: (
          <GuestGuard>
            <RegisterPage />
          </GuestGuard>
        )
      },
      {
        path: 'forgot-password',
        element: (
          <GuestGuard>
            {/* Denne bruker nå den korrekt importerte komponenten */}
            <ForgotPasswordPage />
          </GuestGuard>
        )
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
];

export default routes;
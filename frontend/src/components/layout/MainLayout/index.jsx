import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Home, BarChart2, Settings, Key, HelpCircle, LogOut, 
  Menu, X, LayoutGrid, TrendingUp, PlayCircle 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Components
import Header from '../Header';

// Styles
import './styles.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    // Implementer utlogging (fjern token fra localStorage og naviger til login)
    localStorage.removeItem('token');
    navigate('/auth/login');
  };

  // Navmenus definert med ikon, tekst, link, og active status
  const mainMenuItems = [
    { icon: <Home size={20} />, text: 'Dashboard', link: '/dashboard', active: location.pathname === '/dashboard' },
    { icon: <LayoutGrid size={20} />, text: 'Mine Strategier', link: '/strategies', active: location.pathname === '/strategies' },
    { icon: <TrendingUp size={20} />, text: 'Strategi Builder', link: '/strategy/new/builder', active: location.pathname.includes('/builder') },
    { icon: <BarChart2 size={20} />, text: 'Backtest', link: '/strategy/new/backtest', active: location.pathname.includes('/backtest') },
    { icon: <PlayCircle size={20} />, text: 'Live Trading', link: '/strategy/new/live', active: location.pathname.includes('/live') },
  ];

  const bottomMenuItems = [
    { icon: <Key size={20} />, text: 'API Tilkoblinger', link: '/api-manager', active: location.pathname === '/api-manager' },
    { icon: <Settings size={20} />, text: 'Innstillinger', link: '/settings', active: location.pathname === '/settings' },
    { icon: <HelpCircle size={20} />, text: 'Hjelp', link: '/help', active: location.pathname === '/help' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">FT</span>
            {sidebarOpen && <span className="logo-text">FlowTrader</span>}
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {mainMenuItems.map((item, index) => (
              <li key={index} className={item.active ? 'active' : ''}>
                <Link to={item.link}>
                  {item.icon}
                  {sidebarOpen && <span>{item.text}</span>}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="nav-list bottom">
            {bottomMenuItems.map((item, index) => (
              <li key={index} className={item.active ? 'active' : ''}>
                <Link to={item.link}>
                  {item.icon}
                  {sidebarOpen && <span>{item.text}</span>}
                </Link>
              </li>
            ))}
            <li>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={20} />
                {sidebarOpen && <span>Logg ut</span>}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="main-content">
        <Header sidebarOpen={sidebarOpen} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
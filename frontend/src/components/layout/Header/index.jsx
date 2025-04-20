import React, { useState, useEffect } from 'react';
import { Bell, User, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// API
import { getProfile } from '../../../api/authApi';

// Styles
import './styles.css';

const Header = ({ sidebarOpen }) => {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await getProfile();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    // TODO: Replace with actual notification fetching
    const dummyNotifications = [
      { id: 1, message: 'Strategi "EMA Cross" ga handelssignal', time: '2 minutter siden', read: false },
      { id: 2, message: 'Backtest fullført', time: '1 time siden', read: true },
      { id: 3, message: 'Ny versjon tilgjengelig', time: '1 dag siden', read: true }
    ];
    
    setNotifications(dummyNotifications);
    fetchUserProfile();
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showUserMenu) setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    if (showNotifications) setShowNotifications(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={`app-header ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="header-search">
        <div className="search-bar">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Søk..." 
            className="search-input"
          />
        </div>
      </div>
      
      <div className="header-actions">
        <div className="notifications-dropdown">
          <button 
            className="header-action-btn" 
            onClick={toggleNotifications}
            aria-label="Varsler"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="dropdown-menu notifications-menu">
              <div className="dropdown-header">
                <h3>Varsler</h3>
                {unreadCount > 0 && (
                  <button className="text-btn">Marker alle som lest</button>
                )}
              </div>
              
              <div className="notifications-list">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    >
                      <div className="notification-content">
                        <p className="notification-message">{notification.message}</p>
                        <span className="notification-time">{notification.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-notifications">
                    <p>Ingen varsler</p>
                  </div>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="dropdown-footer">
                  <button className="text-btn">Vis alle varsler</button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="user-dropdown">
          <button 
            className="header-action-btn user-btn" 
            onClick={toggleUserMenu}
            aria-label="Brukermeny"
          >
            {user ? (
              <div className="user-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            ) : (
              <User size={20} />
            )}
          </button>
          
          {showUserMenu && (
            <div className="dropdown-menu user-menu">
              <div className="dropdown-header">
                <h3>{user ? user.name : 'Bruker'}</h3>
                <span className="user-email">{user ? user.email : ''}</span>
              </div>
              
              <div className="menu-items">
                <button 
                  className="menu-item"
                  onClick={() => navigate('/profile')}
                >
                  Min Profil
                </button>
                <button 
                  className="menu-item"
                  onClick={() => navigate('/settings')}
                >
                  Innstillinger
                </button>
                <hr className="menu-divider" />
                <button 
                  className="menu-item logout"
                  onClick={handleLogout}
                >
                  Logg ut
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
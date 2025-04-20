// frontend/src/pages/Profile/index.jsx
import React, { useState, useEffect } from 'react';
import { Edit, CheckCircle, Save, AlertCircle, RefreshCw } from 'lucide-react';

// API calls
import { getProfile, updateProfile } from '../../api/authApi';

import './styles.css';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await getProfile();
        
        // Set profile data
        setProfile(response.data);
        
        // Initialize form fields
        setName(response.data.name || '');
        setEmail(response.data.email || '');
        setPhone(response.data.phone || '');
        setCountry(response.data.country || '');
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Kunne ikke laste profilinformasjon. Vennligst prøv igjen.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const profileData = {
        name,
        email,
        phone,
        country
      };
      
      await updateProfile(profileData);
      
      // Update profile data
      setProfile(prev => ({
        ...prev,
        ...profileData
      }));
      
      // Exit edit mode
      setEditMode(false);
      
      // Show success message
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Kunne ikke oppdatere profilen. Vennligst prøv igjen.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    // Reset form fields to current profile data
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setCountry(profile.country || '');
    
    // Exit edit mode
    setEditMode(false);
  };
  
  if (loading) {
    return <div className="loading-container">Laster profil...</div>;
  }
  
  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">Min Profil</h1>
        
        {!editMode && (
          <button 
            className="btn btn-secondary"
            onClick={() => setEditMode(true)}
          >
            <Edit size={16} />
            <span>Rediger</span>
          </button>
        )}
      </div>
      
      {success && (
        <div className="alert success">
          <CheckCircle size={16} />
          <span>Profilen ble oppdatert</span>
        </div>
      )}
      
      {error && (
        <div className="alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{profile?.name}</h2>
            <div className="profile-meta">
              <div className="meta-item">
                <span className="meta-label">Konto siden</span>
                <span className="meta-value">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Abonnement</span>
                <span className="meta-value">
                  <span className="plan-badge">Pro</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="profile-content">
          <form onSubmit={handleSaveProfile}>
            <div className="form-section">
              <h3 className="section-title">Personlig informasjon</h3>
              
              <div className="form-group">
                <label htmlFor="name">Navn</label>
                <input 
                  type="text" 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  disabled={!editMode}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">E-post</label>
                <input 
                  type="email" 
                  id="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={!editMode}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Telefon (valgfritt)</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    disabled={!editMode}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="country">Land</label>
                  <select 
                    id="country" 
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)} 
                    disabled={!editMode}
                  >
                    <option value="">Velg land</option>
                    <option value="NO">Norge</option>
                    <option value="SE">Sverige</option>
                    <option value="DK">Danmark</option>
                    <option value="FI">Finland</option>
                    <option value="IS">Island</option>
                    <option value="US">USA</option>
                    <option value="GB">Storbritannia</option>
                    <option value="DE">Tyskland</option>
                  </select>
                </div>
              </div>
            </div>
            
            {editMode && (
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Avbryt
                </button>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Lagrer...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Lagre endringer</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
          
          <div className="form-section">
            <h3 className="section-title">API-nøkler</h3>
            
            <div className="api-keys-info">
              <p>
                Du har <strong>2 aktive API-nøkler</strong> for programmatisk tilgang til FlowTrader.
              </p>
              <button className="btn btn-secondary">
                Administrer API-nøkler
              </button>
            </div>
          </div>
          
          <div className="form-section">
            <h3 className="section-title">Statistikk</h3>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">12</div>
                <div className="stat-label">Strategier</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">156</div>
                <div className="stat-label">Backtests</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">23</div>
                <div className="stat-label">Live Handler</div>
              </div>
              
              <div className="stat-card">
                <div className="stat-value">4</div>
                <div className="stat-label">Aktive Strategier</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
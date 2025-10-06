import React from 'react';

// Menerima props yang dibutuhkan dari App.js
const Sidebar = ({ user, onNavigate, onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-placeholder">
          <svg width="40" height="40" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="#FFF" stroke="#20c997" strokeWidth="4"/>
            <text x="50" y="68" fontFamily="Poppins, sans-serif" fontSize="50" fill="#2c3e50" textAnchor="middle" fontWeight="700">NT</text>
          </svg>
        </div>
        <span className="app-name">NutriTrack</span>
      </div>

      <nav className="sidebar-nav">
        <button onClick={() => onNavigate('dashboard')}>
          <span className="nav-icon">📊</span>
          <span className="nav-text">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('tracker')}>
          <span className="nav-icon">📝</span>
          <span className="nav-text">Lacak Makanan</span>
        </button>
        <button onClick={() => onNavigate('analytics')}>
          <span className="nav-icon">📈</span>
          <span className="nav-text">Analisis</span>
        </button>
        <button onClick={() => onNavigate('assistant')}>
  <span className="nav-icon">🤖</span>
  <span className="nav-text">Asisten Nutrisi</span>
</button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <span className="greeting">Halo,</span>
          <span className="user-name">{user ? user.name : 'Pengguna'}</span>
        </div>
        <button onClick={onLogout} className="logout-button-sidebar">
          <span className="nav-icon">🚪</span>
          <span className="nav-text">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
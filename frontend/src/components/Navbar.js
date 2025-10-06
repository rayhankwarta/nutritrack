import React from 'react';

// Menerima prop 'onLogout' dari App.js
const Navbar = ({ onNavigate, onLogout }) => {
  return (
    <nav className="navbar">
      <h1 className="navbar-logo">NutriTrack</h1>
      
      <div className="navbar-links">
        <button onClick={() => onNavigate('dashboard')}>Dashboard</button>
        <button onClick={() => onNavigate('tracker')}>Lacak Makanan</button>
        <button onClick={() => onNavigate('analytics')}>Analisis</button>
      </div>
      
      <div className="navbar-user">
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
import React from 'react';

const Header = ({ onToggleSidebar }) => {
  return (
    <header className="mobile-header">
      <div className="logo-placeholder-mobile">
        <svg width="30" height="30" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="#FFF" stroke="#20c997" strokeWidth="4"/>
          <text x="50" y="68" fontFamily="Poppins, sans-serif" fontSize="50" fill="#2c3e50" textAnchor="middle" fontWeight="700">NT</text>
        </svg>
        <span className="app-name-mobile">NutriTrack</span>
      </div>
      <button onClick={onToggleSidebar} className="hamburger-button">
        ☰
      </button>
    </header>
  );
};

export default Header;
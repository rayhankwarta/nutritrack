import React from 'react';

// Menerima fungsi 'onGetStarted' dari App.js untuk beralih ke halaman login
const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="landing-page">
      {/* BAGIAN HERO (UTAMA) */}
      <header className="hero-section">
        <div className="logo-placeholder">
          {/* Anda bisa ganti SVG ini dengan tag <img> untuk logo Anda */}
          <svg width="60" height="60" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="#FFF" stroke="#20c997" strokeWidth="4"/>
            <text x="50" y="68" fontFamily="Poppins, sans-serif" fontSize="50" fill="#2c3e50" textAnchor="middle" fontWeight="700">NT</text>
          </svg>
        </div>
        <h1>Capai Tujuan Kesehatanmu dengan <span className="highlight">NutriTrack</span></h1>
        <p className="subtitle">
          Lacak asupan harian, analisis pola makan, dan raih kesehatan optimal dengan mudah. 
          Semua dalam satu aplikasi.
        </p>
        <button onClick={onGetStarted} className="cta-button">
          Mulai Lacak Sekarang
        </button>
      </header>

      {/* BAGIAN FITUR-FITUR */}
      <main className="features-section">
        <h2>Fitur Unggulan Kami</h2>
        <div className="features-grid">
          {/* Kartu Fitur 1 */}
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Pencatatan Cerdas</h3>
            <p>Cari jutaan data makanan global dalam Bahasa Indonesia atau catat secara manual dengan cepat dan mudah.</p>
          </div>

          {/* Kartu Fitur 2 */}
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analisis Mendalam</h3>
            <p>Lihat ringkasan kalori dan distribusi makronutrien (protein, karbo, lemak) dalam grafik yang interaktif.</p>
          </div>

          {/* Kartu Fitur 3 */}
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Target Personalisasi</h3>
            <p>Dapatkan rekomendasi target kalori harian yang disesuaikan secara otomatis berdasarkan usia dan jenis kelamin Anda.</p>
          </div>
        </div>
      </main>

      {/* BAGIAN FOOTER */}
      <footer className="footer-section">
        <p>&copy; 2025 NutriTrack. Dirancang untuk kesehatan Anda.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

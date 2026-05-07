import React from 'react';
import logo from '../img/rembg-nutritrack.png';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div style={styles.container}>
      {/* BAGIAN HERO (UTAMA) */}
      <header style={styles.heroSection}>
        <div style={styles.heroContent}>
          <div style={styles.logoContainer}>
            <img 
              src={logo} 
              alt="NutriTrack Logo" 
              style={styles.logoImage}
            />
          </div>
          <h1 style={styles.heroTitle}>
            Capai Tujuan Kesehatanmu dengan <span style={styles.highlight}>NutriTrack</span>
          </h1>
          <p style={styles.subtitle}>
            Lacak asupan harian, analisis pola makan, dan raih kesehatan optimal dengan mudah. 
            Semua dalam satu aplikasi.
          </p>
          <button onClick={onGetStarted} style={styles.ctaButton} 
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 40px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.3)';
            }}>
            Mulai Lacak Sekarang →
          </button>
        </div>
        
        {/* Decorative Elements */}
        <div style={styles.decorCircle1}></div>
        <div style={styles.decorCircle2}></div>
      </header>

      {/* BAGIAN FITUR-FITUR */}
      <main style={styles.featuresSection}>
        <h2 style={styles.featuresTitle}>Fitur Unggulan Kami</h2>
        <p style={styles.featuresSubtitle}>Semua yang Anda butuhkan untuk perjalanan kesehatan yang lebih baik</p>
        
        <div style={styles.featuresGrid}>
          {/* Kartu Fitur 1 */}
          <div style={styles.featureCard}>
            <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
              📝
            </div>
            <h3 style={styles.featureTitle}>Pencatatan Cerdas</h3>
            <p style={styles.featureText}>Cari jutaan data makanan global dalam Bahasa Indonesia atau catat secara manual dengan cepat dan mudah.</p>
          </div>

          {/* Kartu Fitur 2 */}
          <div style={styles.featureCard}>
            <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>
              📊
            </div>
            <h3 style={styles.featureTitle}>Analisis Mendalam</h3>
            <p style={styles.featureText}>Lihat ringkasan kalori dan distribusi makronutrien (protein, karbo, lemak) dalam grafik yang interaktif.</p>
          </div>

          {/* Kartu Fitur 3 */}
          <div style={styles.featureCard}>
            <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'}}>
              🎯
            </div>
            <h3 style={styles.featureTitle}>Target Personalisasi</h3>
            <p style={styles.featureText}>Dapatkan rekomendasi target kalori harian yang disesuaikan secara otomatis berdasarkan usia dan jenis kelamin Anda.</p>
          </div>

          {/* Kartu Fitur 4 */}
          <div style={styles.featureCard}>
            <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'}}>
              📈
            </div>
            <h3 style={styles.featureTitle}>Dashboard Interaktif</h3>
            <p style={styles.featureText}>Pantau progress harian Anda dengan dashboard yang menampilkan ringkasan lengkap asupan nutrisi dan kalori secara real-time.</p>
          </div>

          {/* Kartu Fitur 5 */}
          <div style={styles.featureCard}>
            <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'}}>
              📉
            </div>
            <h3 style={styles.featureTitle}>Analisis Tren</h3>
            <p style={styles.featureText}>Lihat pola makan Anda dari waktu ke waktu dengan grafik tren mingguan dan bulanan untuk evaluasi yang lebih baik.</p>
          </div>

          {/* Kartu Fitur 6 */}
          <div style={styles.featureCard}>
            <div style={{...styles.featureIcon, background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'}}>
              🤖
            </div>
            <h3 style={styles.featureTitle}>Asisten Nutrisi AI</h3>
            <p style={styles.featureText}>Dapatkan saran nutrisi personal, rekomendasi makanan sehat, dan jawaban atas pertanyaan diet Anda dari asisten cerdas kami.</p>
          </div>
        </div>
      </main>

      {/* BAGIAN FOOTER */}
      <footer style={styles.footerSection}>
        <p style={styles.footerText}>&copy; 2025 NutriTrack. Dirancang untuk kesehatan Anda.</p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #3ef074d7 0%, #ffffff 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  
  heroSection: {
    position: 'relative',
    minHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    overflow: 'hidden',
  },
  
  heroContent: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '800px',
  },
  
  logoContainer: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  logoImage: {
    width: '200px',
    height: '200px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 24px rgba(16, 185, 129, 0.2))',
    animation: 'float 3s ease-in-out infinite',
  },
  
  heroTitle: {
    fontSize: '3.5rem',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '24px',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  
  highlight: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  
  subtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '40px',
    lineHeight: '1.8',
    maxWidth: '600px',
    margin: '0 auto 40px',
  },
  
  ctaButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '18px 48px',
    fontSize: '1.1rem',
    fontWeight: '600',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s ease',
    fontFamily: "'Poppins', sans-serif",
  },
  
  decorCircle1: {
    position: 'absolute',
    top: '-100px',
    right: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
    zIndex: 0,
  },
  
  decorCircle2: {
    position: 'absolute',
    bottom: '-150px',
    left: '-150px',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)',
    zIndex: 0,
  },
  
  featuresSection: {
    padding: '100px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 2,
  },
  
  featuresTitle: {
    fontSize: '2.8rem',
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  
  featuresSubtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '60px',
  },
  
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '32px',
    marginTop: '60px',
  },
  
  featureCard: {
    background: 'white',
    padding: '40px 32px',
    borderRadius: '24px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },
  
  featureIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    marginBottom: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
  },
  
  featureTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
  },
  
  featureText: {
    fontSize: '1rem',
    color: '#6b7280',
    lineHeight: '1.7',
  },
  
  footerSection: {
    padding: '40px 20px',
    textAlign: 'center',
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    background: 'white',
  },
  
  footerText: {
    color: '#9ca3af',
    fontSize: '0.95rem',
  },
};

// Menambahkan keyframes untuk animasi float
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  /* Hover effects for feature cards */
  .feature-card-hover {
    transition: all 0.3s ease;
  }
  
  .feature-card-hover:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
  }
`;
document.head.appendChild(styleSheet);

// Add hover effects to feature cards
if (typeof document !== 'undefined') {
  setTimeout(() => {
    const featureCards = document.querySelectorAll('[style*="featureCard"]');
    featureCards.forEach(card => {
      card.classList.add('feature-card-hover');
    });
  }, 100);
}

export default LandingPage;
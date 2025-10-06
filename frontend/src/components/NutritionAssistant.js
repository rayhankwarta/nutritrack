import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const NutritionAssistant = ({ foodLogs, user }) => {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const calculateCalorieGoal = (ageCategory) => { /* ... (fungsi ini tidak berubah) ... */ };
  
  const dailyGoals = {
    calories: user ? calculateCalorieGoal(user.ageCategory) : 2350,
    protein: 100, carbohydrates: 250, fat: 65,
  };

  const handleGetAnalysis = async () => {
    setIsLoading(true);
    setAnalysis('');

    const today = new Date().toLocaleDateString('en-CA');
    const todayFoodLogs = foodLogs.filter(log => new Date(log.date).toLocaleDateString('en-CA') === today);

    try {
      const response = await axios.post('/api/assistant/analysis', {
        user,
        foodLogs: todayFoodLogs,
        dailyGoals,
      });
      setAnalysis(response.data.analysisText);
    } catch (error) {
      // --- PERBAIKAN: LOGGING ERROR YANG LEBIH DETAIL ---
      console.error("Gagal mendapatkan analisis:", error);
      if (error.response) {
        // Server merespons dengan status error (seperti 404, 500, 401)
        console.error('Pesan Error dari Server:', error.response.data);
        console.error('Status Error:', error.response.status);
        alert(`Gagal mendapatkan analisis. Error ${error.response.status}: ${error.response.data.message}`);
      } else if (error.request) {
        // Request dikirim tapi tidak ada respons
        console.error('Request Error:', error.request);
        alert('Tidak ada respons dari server. Pastikan server backend Anda berjalan.');
      } else {
        // Terjadi kesalahan lain
        console.error('Error:', error.message);
        alert('Terjadi kesalahan saat membuat permintaan.');
      }
      // --------------------------------------------------------
    }
    setIsLoading(false);
  };
  return (
    <div className="assistant-container">
      <h2>Asisten Nutrisi 🤖</h2>
      <p className="assistant-subtitle">Dapatkan analisis instan dan rekomendasi cerdas dari AI untuk asupan nutrisi Anda hari ini.</p>
      
      <button onClick={handleGetAnalysis} disabled={isLoading} className="cta-button">
        {isLoading ? 'AI Sedang Menganalisis...' : 'Berikan Saya Analisis'}
      </button>

      {/* Tampilan baru untuk hasil analisis */}
      {isLoading && <div className="loader"></div>}
      {analysis && (
        <div className="analysis-result-box">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default NutritionAssistant;
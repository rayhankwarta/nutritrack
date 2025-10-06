import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Daftarkan komponen Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Menerima 'user' sebagai prop baru untuk kalkulasi dinamis
const Dashboard = ({ foodLogs, user, onDelete }) => {

  // Fungsi untuk menghitung target kalori berdasarkan usia dan gender dari data 'user'
  const calculateCalorieGoal = (ageCategory) => {
    if (!ageCategory) return 2350; // Default untuk dewasa jika tidak ada data

    switch (ageCategory) {
      case 'balita': return 1350;
      case 'anak_kecil': return 1550;
      case 'anak_anak': return 1700;
      case 'remaja_awal': return 2100;
      case 'remaja': return 2350;
      case 'remaja_akhir': return 2450;
      case 'dewasa_muda': return 2450;
      case 'dewasa': return 2350;
      case 'pra_lansia': return 2000;
      case 'lansia': return 1700;
      default: return 2350; // Nilai default jika kategori tidak cocok
    }
  };

 const dailyGoals = {
    // Panggil fungsi dengan ageCategory dari data pengguna
    calories: user ? calculateCalorieGoal(user.ageCategory) : 2350,
    protein: 100, // Ini juga bisa dibuat dinamis nanti
    carbohydrates: 250,
    fat: 65,
  };

  // Menghitung total nutrisi dari makanan yang sudah dicatat
  const totals = foodLogs.reduce(
    (acc, log) => {
      acc.totalCalories += log.calories;
      acc.totalProtein += log.protein;
      acc.totalCarbs += log.carbohydrates;
      acc.totalFat += log.fat;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );

  const remainingCalories = dailyGoals.calories - totals.totalCalories;

  // Data untuk grafik donat
  const chartData = {
    labels: ['Protein (g)', 'Karbohidrat (g)', 'Lemak (g)'],
    datasets: [
      {
        label: 'Makronutrien',
        data: [totals.totalProtein, totals.totalCarbs, totals.totalFat],
        backgroundColor: [ 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 'rgba(255, 99, 132, 0.8)' ],
        borderColor: [ 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)' ],
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Distribusi Makronutrien Harian', font: { size: 16, family: 'Poppins' } } },
    maintainAspectRatio: false,
  };

  // Mengelompokkan log makanan berdasarkan waktu makan
  const groupedLogs = foodLogs.reduce((acc, log) => {
    const meal = log.mealType;
    if (!acc[meal]) { acc[meal] = []; }
    acc[meal].push(log);
    return acc;
  }, {});
  const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const mealDetails = {
    Breakfast: { title: 'Sarapan', icon: '☀️' },
    Lunch: { title: 'Makan Siang', icon: '🍗' },
    Dinner: { title: 'Makan Malam', icon: '🌙' },
    Snacks: { title: 'Cemilan', icon: '🍿' },
  };

  return (
    <div className="dashboard-container">
      <h2>Ringkasan Harian</h2>
      <div className="summary-cards">
        <div className="card calories-card">
          <h3>Sisa Kalori</h3>
          <p className="large-number">{Math.round(remainingCalories)}</p>
          <span>dari {dailyGoals.calories} kkal</span>
        </div>
        <div className="card protein-card">
          <h3>Protein</h3>
          <p>{Math.round(totals.totalProtein)} / {dailyGoals.protein} g</p>
        </div>
        <div className="card carbs-card">
          <h3>Karbohidrat</h3>
          <p>{Math.round(totals.totalCarbs)} / {dailyGoals.carbohydrates} g</p>
        </div>
        <div className="card fat-card">
          <h3>Lemak</h3>
          <p>{Math.round(totals.totalFat)} / {dailyGoals.fat} g</p>
        </div>
      </div>
      <div className="dashboard-main-content">
        <div className="chart-container">
          <Doughnut data={chartData} options={chartOptions} />
        </div>
        <div className="food-log-list">
          <h3>Log Makanan Hari Ini</h3>
          {foodLogs && foodLogs.length > 0 ? (
            mealOrder.map(mealType => 
              groupedLogs[mealType] && (
                <div key={mealType} className="meal-group">
                  <h4>
                    <span className="meal-icon">{mealDetails[mealType].icon}</span>
                    {mealDetails[mealType].title}
                  </h4>
                  <ul>
                    {groupedLogs[mealType].map((log) => (
                      <li key={log._id}>
                        {/* --- INI ADALAH PERBAIKAN STRUKTUR HTML --- */}
                        <div className="food-item-details">
                          <span className="food-name">{log.foodName}</span>
                          <span className="food-calories">{Math.round(log.calories)} kkal</span>
                        </div>
                        <button onClick={() => onDelete(log._id)} className="delete-button">
  🗑️
</button>
                        {/* ------------------------------------------- */}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )
          ) : (
            <p>Belum ada makanan yang dicatat hari ini.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
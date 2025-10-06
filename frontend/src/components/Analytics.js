import React, { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const Analytics = ({ foodLogs, user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [barChartMetric, setBarChartMetric] = useState('calories');

  const calculateCalorieGoal = (ageCategory) => {
    if (!ageCategory) return 2350;
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
      default: return 2350;
    }
  };

  const calorieGoal = user ? calculateCalorieGoal(user.ageCategory) : 2350;

  const processedData = useMemo(() => {
    if (!foodLogs) return {};
    return foodLogs.reduce((acc, log) => {
      if (log.date) {
        const date = new Date(log.date).toLocaleDateString('en-CA');
        if (!acc[date]) {
          acc[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        }
        acc[date].calories += log.calories;
        acc[date].protein += log.protein;
        acc[date].carbs += log.carbohydrates;
        acc[date].fat += log.fat;
      }
      return acc;
    }, {});
  }, [foodLogs]);

  const getTileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = date.toLocaleDateString('en-CA');
      if (processedData[dateString]) {
        const calories = processedData[dateString].calories;
        if (calories > calorieGoal) return 'calorie-red';
        if (calories < calorieGoal * 0.9) return 'calorie-green';
        return 'calorie-yellow';
      }
    }
    return null;
  };

  const lineChartData = useMemo(() => {
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString('en-CA');
      labels.push(date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
      data.push(processedData[dateString]?.calories || 0);
    }
    return {
      labels,
      datasets: [{
        label: 'Total Kalori (kkal)',
        data,
        borderColor: '#20c997',
        backgroundColor: 'rgba(32, 201, 151, 0.2)',
        fill: true,
        tension: 0.3,
      }],
    };
  }, [processedData]);

  const barChartData = useMemo(() => {
    const dateString = selectedDate.toLocaleDateString('en-CA');
    const logsForSelectedDay = foodLogs.filter(log => log.date && new Date(log.date).toLocaleDateString('en-CA') === dateString);
    const dataByMeal = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };
    const metricMap = { calories: 'calories', protein: 'protein', carbs: 'carbohydrates', fat: 'fat' };
    const metric = metricMap[barChartMetric];

    logsForSelectedDay.forEach(log => {
      dataByMeal[log.mealType] += log[metric] || 0;
    });

    return {
      labels: ['Sarapan', 'Makan Siang', 'Makan Malam', 'Cemilan'],
      datasets: [{
        label: `Total ${barChartMetric.charAt(0).toUpperCase() + barChartMetric.slice(1)}`,
        data: [dataByMeal.Breakfast, dataByMeal.Lunch, dataByMeal.Dinner, dataByMeal.Snacks],
        backgroundColor: ['#3498db', '#f1c40f', '#e74c3c', '#9b59b6'],
      }],
    };
  }, [foodLogs, selectedDate, barChartMetric]);

  const lineChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const barChartOptions = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } };

  return (
    <div className="analytics-container">
      <h2>Analisis & Tren Konsumsi</h2>
      <div className="chart-card">
        <h3>Tren 7 Hari Terakhir</h3>
        <div className="chart-wrapper line-chart">
          <Line options={lineChartOptions} data={lineChartData} />
        </div>
      </div>
      <div className="bottom-section">
        <div className="chart-card">
          <h3>Riwayat Harian</h3>
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileClassName={getTileClassName}
          />
          <div className="legend-container">
            <span className="legend-item"><span className="color-box green"></span>Berhasil</span>
            <span className="legend-item"><span className="color-box yellow"></span>Pas</span>
            <span className="legend-item"><span className="color-box red"></span>Berlebih</span>
          </div>
        </div>
        <div className="chart-card">
          <h3>Detail Nutrisi ({selectedDate.toLocaleDateString('id-ID', { dateStyle: 'long' })})</h3>
          <div className="filter-container">
            <label>Tampilkan Metrik: </label>
            <select value={barChartMetric} onChange={(e) => setBarChartMetric(e.target.value)}>
              <option value="calories">Kalori</option>
              <option value="protein">Protein</option>
              <option value="carbs">Karbohidrat</option>
              <option value="fat">Lemak</option>
            </select>
          </div>
          <div className="chart-wrapper bar-chart">
            <Bar options={barChartOptions} data={barChartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
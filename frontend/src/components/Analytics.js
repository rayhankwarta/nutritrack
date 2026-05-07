import React, { useState, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ================================
// FUNGSI UTILITAS YANG TELAH DISESUAIKAN (WHO & PAL & REAL AGE)
// ================================

// Fungsi menghitung kebutuhan kalori berdasarkan WHO & Harris-Benedict (SAMA dengan Dashboard)
const calculateCalorieGoal = (user) => {
  // Validasi user data
  // Minimal butuh gender, berat, tinggi untuk estimasi kasar
  if (!user?.gender || !user?.weight || !user?.height) return 2000;

  // Ambil data user
  const {
    gender,
    weight,
    height,
    age, // Mengambil umur asli (angka) dari input user
    ageCategory, // Tetap diambil untuk aturan diskon (Rule-Based)
    activityLevel = "sedentary", // Default ke sedentary jika kosong
  } = user;

  // LOGIKA UMUR: Prioritaskan umur angka (user.age).
  // Jika tidak ada (user lama), fallback ke estimasi kategori.
  let exactAge = age;
  if (!exactAge) {
    const ageMap = {
      balita: 2,
      anak_kecil: 5,
      anak_anak: 8,
      remaja_awal: 11,
      remaja: 14,
      remaja_akhir: 17,
      dewasa_muda: 24,
      dewasa: 40,
      pra_lansia: 57,
      lansia: 70,
    };
    exactAge = ageMap[ageCategory] || 30;
  }

  // Rumus Harris-Benedict (Revised 1984)
  // Menggunakan exactAge agar perhitungan presisi sesuai input user
  let bmr = 0;
  if (gender === "Male") {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * exactAge;
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * exactAge;
  }

  // === LOGIKA PAL (Physical Activity Level) WHO/FAO 2004 ===
  const activityMultipliers = {
    sedentary: 1.2, // Tidak banyak bergerak
    light: 1.375, // Ringan (1-3 hari)
    moderate: 1.55, // Sedang (3-5 hari)
    active: 1.725, // Berat (6-7 hari)
    extreme: 1.9, // Ekstrem (Atlet/Fisik berat)
  };

  // Menggunakan multiplier dinamis dari user, fallback ke 1.2
  const activityFactor = activityMultipliers[activityLevel] || 1.2;

  let tdee = bmr * activityFactor;

  // Adjust berdasarkan kategori usia (rekomendasi WHO - Rule Based)
  switch (ageCategory) {
    case "balita":
      return 1350;
    case "anak_kecil":
      return 1550;
    case "anak_anak":
      return 1700;
    case "remaja_awal":
      return 2100;
    case "remaja":
      return 2350;
    case "remaja_akhir":
      return 2450;
    case "dewasa_muda":
      return Math.round(tdee); // Metabolisme puncak (Murni)
    case "dewasa":
      return Math.round(tdee * 0.95); // Penurunan metabolisme ~5%
    case "pra_lansia":
      return Math.round(tdee * 0.85); // Penurunan massa otot ~15%
    case "lansia":
      return Math.round(tdee * 0.75); // Penurunan signifikan ~25%
    default:
      return Math.round(tdee);
  }
};

// Fungsi menghitung target makronutrien berdasarkan WHO (SAMA dengan Dashboard)
const calculateMacroGoals = (user, calorieGoal) => {
  if (!user) {
    return {
      protein: 50,
      carbs: 275,
      fat: 65,
    };
  }

  const { ageCategory } = user;

  // Rekomendasi WHO untuk distribusi makronutrien
  let proteinPercentage, carbPercentage, fatPercentage;

  if (
    ageCategory === "remaja_awal" ||
    ageCategory === "remaja" ||
    ageCategory === "remaja_akhir"
  ) {
    proteinPercentage = 0.25;
    carbPercentage = 0.5;
    fatPercentage = 0.25;
  } else if (ageCategory === "lansia" || ageCategory === "pra_lansia") {
    proteinPercentage = 0.25;
    carbPercentage = 0.5;
    fatPercentage = 0.25;
  } else {
    proteinPercentage = 0.2;
    carbPercentage = 0.55;
    fatPercentage = 0.25;
  }

  return {
    protein: Math.round((calorieGoal * proteinPercentage) / 4),
    carbs: Math.round((calorieGoal * carbPercentage) / 4),
    fat: Math.round((calorieGoal * fatPercentage) / 9),
  };
};

// ================================
// FUNGSI SKOR NUTRISI
// ================================

// Fungsi helper untuk menghitung skor makronutrien individu
const calculateMacroScore = (actual, target) => {
  if (target === 0) return 100;

  const ratio = actual / target;

  if (ratio >= 0.9 && ratio <= 1.1) {
    return 100;
  } else if (ratio >= 0.8 && ratio <= 1.2) {
    return 90;
  } else if (ratio >= 0.7 && ratio <= 1.3) {
    return 70;
  } else if (ratio < 0.7) {
    return Math.max(0, (ratio / 0.7) * 70);
  } else {
    return Math.max(0, 100 - ((ratio - 1.3) / 0.7) * 30);
  }
};

// Fungsi untuk bonus/penalty keseimbangan makronutrien
const calculateMacroBalanceBonus = (dayTotals, macroGoals) => {
  const totalMacroCalories =
    dayTotals.protein * 4 + dayTotals.carbs * 4 + dayTotals.fat * 9;
  if (totalMacroCalories === 0) return 0;

  const proteinRatio = (dayTotals.protein * 4) / totalMacroCalories;
  const carbRatio = (dayTotals.carbs * 4) / totalMacroCalories;
  const fatRatio = (dayTotals.fat * 9) / totalMacroCalories;

  // Target rasio (SAMA dengan Dashboard)
  const targetProteinRatio = 0.2;
  const targetCarbRatio = 0.55;
  const targetFatRatio = 0.25;

  const proteinDeviation = Math.abs(proteinRatio - targetProteinRatio);
  const carbDeviation = Math.abs(carbRatio - targetCarbRatio);
  const fatDeviation = Math.abs(fatRatio - targetFatRatio);

  const totalDeviation = proteinDeviation + carbDeviation + fatDeviation;

  if (totalDeviation < 0.1) return 10;
  if (totalDeviation < 0.2) return 5;
  if (totalDeviation > 0.4) return -10;
  if (totalDeviation > 0.3) return -5;

  return 0;
};

// Fungsi utama untuk menghitung skor nutrisi
const calculateDailyNutritionScore = (dayTotals, calorieGoal, macroGoals) => {
  if (!dayTotals || dayTotals.calories === 0) return 0;

  let totalScore = 0;

  // 1. Skor Kalori
  const calorieDeviation = Math.abs(dayTotals.calories - calorieGoal);
  const calorieTolerance = calorieGoal * 0.15;

  let calorieScore = 0;
  if (calorieDeviation <= calorieTolerance) {
    calorieScore = 100;
  } else {
    const excessRatio = Math.min(calorieDeviation / calorieGoal, 1.0);
    calorieScore = Math.max(0, 100 - excessRatio * 60);
  }
  totalScore += calorieScore * 0.4;

  // 2. Skor Makronutrien
  const macroScores = {
    protein: calculateMacroScore(dayTotals.protein, macroGoals.protein),
    carbs: calculateMacroScore(dayTotals.carbs, macroGoals.carbs),
    fat: calculateMacroScore(dayTotals.fat, macroGoals.fat),
  };

  totalScore += macroScores.protein * 0.2;
  totalScore += macroScores.carbs * 0.2;
  totalScore += macroScores.fat * 0.2;

  // 3. Bonus/Penalty
  const balanceBonus = calculateMacroBalanceBonus(dayTotals, macroGoals);
  totalScore += balanceBonus;

  return Math.max(0, Math.min(100, Math.round(totalScore)));
};

// ================================
// KOMPONEN UTAMA ANALYTICS
// ================================

const Analytics = ({ foodLogs, user }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [barChartMetric, setBarChartMetric] = useState("calories");
  const [timeRange, setTimeRange] = useState("7days");
  const [activeTab, setActiveTab] = useState("overview");

  // Process data dengan format yang KONSISTEN dengan dashboard.js
  const processedData = useMemo(() => {
    if (!foodLogs) return {};

    return foodLogs.reduce((acc, log) => {
      if (log.date) {
        // Format tanggal yang SAMA dengan dashboard.js (WIB timezone)
        const logDate = new Date(log.date);
        const logDateWIB = new Date(
          logDate.getTime() + (7 * 60 + logDate.getTimezoneOffset()) * 60000
        );
        const dateString = logDateWIB.toLocaleDateString("en-CA");

        if (!acc[dateString]) {
          acc[dateString] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            logs: [],
          };
        }
        acc[dateString].calories += log.calories;
        acc[dateString].protein += log.protein;
        acc[dateString].carbs += log.carbohydrates;
        acc[dateString].fat += log.fat;
        acc[dateString].logs.push(log);
      }
      return acc;
    }, {});
  }, [foodLogs]);

  // Calculate goals (Menggunakan logic baru dengan PAL & Age Angka)
  const userCalorieGoal = useMemo(() => calculateCalorieGoal(user), [user]);
  const userMacroGoals = useMemo(
    () => calculateMacroGoals(user, userCalorieGoal),
    [user, userCalorieGoal]
  );

  // Goal Setting State
  const [goals, setGoals] = useState({
    calorieGoal: userCalorieGoal,
    proteinGoal: userMacroGoals.protein,
    carbsGoal: userMacroGoals.carbs,
    fatGoal: userMacroGoals.fat,
  });

  const calorieGoal = goals.calorieGoal;

  // Calculate Nutrition Score
  const currentNutritionScore = useMemo(() => {
    const selectedDateString = selectedDate.toLocaleDateString("en-CA");
    const selectedDateData = processedData[selectedDateString];

    if (!selectedDateData || selectedDateData.calories === 0) return 0;

    return calculateDailyNutritionScore(
      selectedDateData,
      calorieGoal,
      userMacroGoals
    );
  }, [selectedDate, calorieGoal, processedData, userMacroGoals]);

  const [nutritionScore, setNutritionScore] = useState(0);

  // Weekly Reports Data
  const generateWeeklyReport = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString("en-CA"));
    }

    const weeklyCalories = last7Days.map(
      (date) => processedData[date]?.calories || 0
    );
    const weeklyProtein = last7Days.map(
      (date) => processedData[date]?.protein || 0
    );
    const weeklyCarbs = last7Days.map(
      (date) => processedData[date]?.carbs || 0
    );
    const weeklyFat = last7Days.map((date) => processedData[date]?.fat || 0);

    const weeklyScores = last7Days.map((date) => {
      const dayData = processedData[date];
      if (!dayData || dayData.calories === 0) return 0;
      return calculateDailyNutritionScore(dayData, calorieGoal, userMacroGoals);
    });

    const avgCalories = weeklyCalories.reduce((a, b) => a + b, 0) / 7;
    const avgProtein = weeklyProtein.reduce((a, b) => a + b, 0) / 7;
    const avgCarbs = weeklyCarbs.reduce((a, b) => a + b, 0) / 7;
    const avgFat = weeklyFat.reduce((a, b) => a + b, 0) / 7;
    const avgNutritionScore = weeklyScores.reduce((a, b) => a + b, 0) / 7;

    const daysMetGoal = weeklyCalories.filter(
      (cal) => cal >= calorieGoal * 0.85 && cal <= calorieGoal * 1.15
    ).length;

    return {
      avgCalories: Math.round(avgCalories),
      avgProtein: Math.round(avgProtein),
      avgCarbs: Math.round(avgCarbs),
      avgFat: Math.round(avgFat),
      avgNutritionScore: Math.round(avgNutritionScore),
      daysMetGoal,
      consistency: Math.round((daysMetGoal / 7) * 100),
      trend:
        avgCalories > calorieGoal * 1.1
          ? "up"
          : avgCalories < calorieGoal * 0.9
          ? "down"
          : "stable",
    };
  };

  // Predictive Analytics
  const calculatePredictiveAnalytics = () => {
    if (!processedData || Object.keys(processedData).length < 7) return null;

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last30Days.push(date.toLocaleDateString("en-CA"));
    }

    const dailyCalories = last30Days.map(
      (date) => processedData[date]?.calories || 0
    );

    const validDays = dailyCalories.filter((cal) => cal > 0);
    if (validDays.length < 7) return null;

    const avgCalorieIntake =
      validDays.reduce((a, b) => a + b, 0) / validDays.length;

    const weeklyCalorieBalance = (avgCalorieIntake - calorieGoal) * 7;
    const predictedWeeklyWeightChange = weeklyCalorieBalance / 7700;
    const predictedMonthlyWeightChange = predictedWeeklyWeightChange * 4;

    return {
      weeklyChange: predictedWeeklyWeightChange,
      monthlyChange: predictedMonthlyWeightChange,
      trend:
        predictedWeeklyWeightChange > 0.1
          ? "gain"
          : predictedWeeklyWeightChange < -0.1
          ? "loss"
          : "maintain",
      confidence: Math.min((validDays.length / 30) * 100, 100),
    };
  };

  const getMealPatternAnalysis = () => {
    const selectedDateString = selectedDate.toLocaleDateString("en-CA");
    const dayData = processedData[selectedDateString];

    if (!dayData || dayData.logs.length === 0) {
      return { insights: [], recommendations: [] };
    }

    const insights = [];
    const recommendations = [];

    const mealTimes = dayData.logs.map((log) => {
      const logTime = new Date(log.date);
      return logTime.getHours() * 60 + logTime.getMinutes();
    });

    mealTimes.sort((a, b) => a - b);

    for (let i = 1; i < mealTimes.length; i++) {
      const gap = mealTimes[i] - mealTimes[i - 1];
      if (gap > 240) {
        insights.push("Ada jarak lebih dari 4 jam antara waktu makan");
        recommendations.push(
          "Coba untuk makan dengan interval yang lebih teratur (setiap 3-4 jam)"
        );
      }
    }

    const totalCalories = dayData.calories;
    if (totalCalories > 0) {
      const proteinPercentage = ((dayData.protein * 4) / totalCalories) * 100;
      const carbPercentage = ((dayData.carbs * 4) / totalCalories) * 100;
      const fatPercentage = ((dayData.fat * 9) / totalCalories) * 100;

      if (proteinPercentage < 18) {
        insights.push("Asupan protein di bawah range optimal (20-25%)");
        recommendations.push(
          "Tambah konsumsi protein seperti daging, ikan, telur, atau kacang-kacangan"
        );
      } else if (proteinPercentage > 27) {
        insights.push("Asupan protein di atas range optimal");
        recommendations.push(
          "Pertimbangkan untuk menyeimbangkan dengan lebih banyak karbohidrat kompleks"
        );
      }

      if (carbPercentage > 60) {
        insights.push("Asupan karbohidrat cukup tinggi");
        recommendations.push(
          "Pertimbangkan untuk menyeimbangkan dengan lebih banyak protein dan lemak sehat"
        );
      } else if (carbPercentage < 50) {
        insights.push("Asupan karbohidrat di bawah range optimal (55%)");
        recommendations.push(
          "Tambah konsumsi karbohidrat kompleks seperti nasi merah, gandum utuh, atau sayuran"
        );
      }

      if (fatPercentage < 22) {
        insights.push("Asupan lemak mungkin terlalu rendah");
        recommendations.push(
          "Tambahkan sumber lemak sehat seperti alpukat, kacang-kacangan, atau minyak zaitun"
        );
      } else if (fatPercentage > 28) {
        insights.push("Asupan lemak di atas range optimal (25%)");
        recommendations.push(
          "Kurangi konsumsi lemak jenuh dan tingkatkan lemak tak jenuh"
        );
      }
    }

    return { insights, recommendations };
  };

  const getWeeklyStats = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString("en-CA"));
    }

    const weeklyData = last7Days.map(
      (date) => processedData[date]?.calories || 0
    );
    const averageCalories = weeklyData.reduce((sum, cal) => sum + cal, 0) / 7;

    const daysMetGoal = weeklyData.filter(
      (cal) => cal >= calorieGoal * 0.85 && cal <= calorieGoal * 1.15
    ).length;

    return {
      averageCalories: Math.round(averageCalories),
      daysMetGoal,
      consistency: Math.round((daysMetGoal / 7) * 100),
    };
  };

  const getTileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateString = date.toLocaleDateString("en-CA");
      if (processedData[dateString]) {
        const calories = processedData[dateString].calories;
        if (calories > calorieGoal * 1.15) return "calorie-red";
        if (calories < calorieGoal * 0.85) return "calorie-green";
        return "calorie-yellow";
      }
    }
    return null;
  };

  // Chart data
  const lineChartData = useMemo(() => {
    let daysToShow = 7;
    if (timeRange === "30days") daysToShow = 30;
    if (timeRange === "14days") daysToShow = 14;

    const labels = [];
    const data = [];
    const goalData = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString("en-CA");

      let label;
      if (timeRange === "7days") {
        label = date.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
        });
      } else if (timeRange === "14days") {
        label = date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
      } else {
        label = date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
      }

      labels.push(label);
      data.push(processedData[dateString]?.calories || 0);
      goalData.push(calorieGoal);
    }

    return {
      labels,
      datasets: [
        {
          label: "Target Kalori",
          data: goalData,
          borderColor: "#95a5a6",
          backgroundColor: "rgba(149, 165, 166, 0.1)",
          borderDash: [5, 5],
          fill: false,
          tension: 0,
        },
        {
          label: "Konsumsi Aktual",
          data,
          borderColor: "#20c997",
          backgroundColor: "rgba(32, 201, 151, 0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [processedData, timeRange, calorieGoal]);

  const macronutrientData = useMemo(() => {
    const selectedDateString = selectedDate.toLocaleDateString("en-CA");
    const dayData = processedData[selectedDateString];

    if (!dayData) {
      return {
        labels: ["Tidak ada data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e9ecef"],
          },
        ],
      };
    }

    const proteinCalories = dayData.protein * 4;
    const carbCalories = dayData.carbs * 4;
    const fatCalories = dayData.fat * 9;

    return {
      labels: ["Protein", "Karbohidrat", "Lemak"],
      datasets: [
        {
          data: [proteinCalories, carbCalories, fatCalories],
          backgroundColor: ["#3498db", "#f1c40f", "#e74c3c"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  }, [processedData, selectedDate]);

  const barChartData = useMemo(() => {
    const dateString = selectedDate.toLocaleDateString("en-CA");
    const logsForSelectedDay = processedData[dateString]?.logs || [];

    const dataByMeal = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };
    const metricMap = {
      calories: "calories",
      protein: "protein",
      carbs: "carbs",
      fat: "fat",
    };
    const metric = metricMap[barChartMetric];

    logsForSelectedDay.forEach((log) => {
      if (log.mealType && dataByMeal.hasOwnProperty(log.mealType)) {
        dataByMeal[log.mealType] +=
          log[metric === "carbs" ? "carbohydrates" : metric] || 0;
      }
    });

    return {
      labels: ["Sarapan", "Makan Siang", "Makan Malam", "Cemilan"],
      datasets: [
        {
          label: `Total ${
            barChartMetric.charAt(0).toUpperCase() + barChartMetric.slice(1)
          }`,
          data: [
            dataByMeal.Breakfast,
            dataByMeal.Lunch,
            dataByMeal.Dinner,
            dataByMeal.Snacks,
          ],
          backgroundColor: ["#3498db", "#f1c40f", "#e74c3c", "#9b59b6"],
          borderRadius: 8,
        },
      ],
    };
  }, [processedData, selectedDate, barChartMetric]);

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
    cutout: "65%",
  };

  // Data untuk render
  const selectedDateString = selectedDate.toLocaleDateString("en-CA");
  const selectedDateData = processedData[selectedDateString];
  const weeklyStats = getWeeklyStats();
  const patternAnalysis = getMealPatternAnalysis();
  const weeklyReport = generateWeeklyReport();
  const prediction = calculatePredictiveAnalytics();

  const getFrequentFoods = () => {
    const allFoods = {};
    foodLogs.forEach((log) => {
      allFoods[log.foodName] = (allFoods[log.foodName] || 0) + 1;
    });

    return Object.entries(allFoods)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({ food, count }));
  };

  const frequentFoods = getFrequentFoods();

  // Helper untuk menampilkan label aktivitas
  const getActivityLabel = (level) => {
    const labels = {
      sedentary: "Sedentary (1.2)",
      light: "Light Active (1.375)",
      moderate: "Moderate (1.55)",
      active: "Very Active (1.725)",
      extreme: "Extra Active (1.9)",
    };
    return labels[level] || "Sedentary";
  };

  // Update nutrition score ketika data berubah
  React.useEffect(() => {
    setNutritionScore(currentNutritionScore);
  }, [currentNutritionScore]);

  // Update goals ketika user berubah
  React.useEffect(() => {
    setGoals({
      calorieGoal: userCalorieGoal,
      proteinGoal: userMacroGoals.protein,
      carbsGoal: userMacroGoals.carbs,
      fatGoal: userMacroGoals.fat,
    });
  }, [userCalorieGoal, userMacroGoals]);

  // useEffect untuk sinkronisasi data real-time
  React.useEffect(() => {
    const recalcScore = () => {
      const selectedDateString = selectedDate.toLocaleDateString("en-CA");
      const selectedDateData = processedData[selectedDateString];

      if (selectedDateData && selectedDateData.calories > 0) {
        const newScore = calculateDailyNutritionScore(
          selectedDateData,
          calorieGoal,
          userMacroGoals
        );
        setNutritionScore(newScore);
      } else {
        setNutritionScore(0);
      }
    };

    recalcScore();
  }, [processedData, selectedDate, calorieGoal, userMacroGoals]);

  return (
    <div className="analytics-container modern">
      {/* HEADER */}
      <div className="analytics-header">
        <div className="header-content">
          <h1>Analisis Nutrisi</h1>
          <p>Pantau perkembangan dan pola konsumsi makanan Anda</p>
          {user && (
            <div className="user-profile-info">
              <span className="profile-badge">👤 {user.name}</span>
              <span className="profile-badge">
                🎯 {user.ageCategory?.replace(/_/g, " ")}
              </span>
              <span className="profile-badge">
                {user.gender === "Male" ? "👨" : "👩"}{" "}
                {user.gender === "Male" ? "Laki-laki" : "Perempuan"}
              </span>
              {/* === [UPDATE] Tampilkan Activity Level di Header === */}
              <span
                className="profile-badge"
                style={{ background: "#f0f4c3", color: "#827717" }}
              >
                🏃 {getActivityLabel(user.activityLevel || "sedentary")}
              </span>
            </div>
          )}
        </div>
        <div className="date-display">
          {selectedDate.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="analytics-tabs">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">Overview</span>
        </button>
        <button
          className={`tab-button ${activeTab === "goals" ? "active" : ""}`}
          onClick={() => setActiveTab("goals")}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-text">Goals</span>
        </button>
        <button
          className={`tab-button ${activeTab === "weekly" ? "active" : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-text">Weekly</span>
        </button>
        <button
          className={`tab-button ${activeTab === "predictive" ? "active" : ""}`}
          onClick={() => setActiveTab("predictive")}
        >
          <span className="tab-icon">🔮</span>
          <span className="tab-text">Predictive</span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <>
          {/* STATISTIK UTAMA */}
          <div className="main-stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-main">
                  <div className="stat-value">
                    {calorieGoal.toLocaleString()}
                  </div>
                  <div className="stat-label">Target Kalori</div>
                  <div className="stat-source">Berdasarkan profil Anda</div>
                </div>
                <div className="stat-icon">🎯</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-main">
                  <div className="stat-value">
                    {selectedDateData
                      ? selectedDateData.calories.toLocaleString()
                      : "0"}
                  </div>
                  <div className="stat-label">Konsumsi Hari Ini</div>
                  <div className="stat-source">Total asupan kalori</div>
                </div>
                <div className="stat-icon">🍽️</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-main">
                  <div
                    className={`stat-value ${
                      nutritionScore >= 80
                        ? "positive"
                        : nutritionScore >= 60
                        ? "neutral"
                        : "negative"
                    }`}
                  >
                    {nutritionScore}%
                  </div>
                  <div className="stat-label">Nutrition Score</div>
                  <div className="stat-source">
                    {selectedDateData
                      ? "Kualitas nutrisi hari ini"
                      : "Tidak ada data"}
                  </div>
                </div>
                <div className="stat-icon">⭐</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-main">
                  <div className="stat-value">{weeklyStats.consistency}%</div>
                  <div className="stat-label">Konsistensi Mingguan</div>
                  <div className="stat-source">Pencapaian target 7 hari</div>
                </div>
                <div className="stat-icon">📊</div>
              </div>
            </div>
          </div>

          {/* CHART SECTION */}
          <div className="charts-section">
            <div className="chart-row">
              <div className="chart-card large">
                <div className="chart-header">
                  <h3>Tren Konsumsi Kalori</h3>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="chart-filter"
                  >
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="14days">14 Hari Terakhir</option>
                    <option value="30days">30 Hari Terakhir</option>
                  </select>
                </div>
                <div className="chart-wrapper">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Komposisi Makronutrien</h3>
                  <div className="macro-info">
                    <span className="macro-item protein">
                      Protein: {goals.proteinGoal}g
                    </span>
                    <span className="macro-item carbs">
                      Karbo: {goals.carbsGoal}g
                    </span>
                    <span className="macro-item fat">
                      Lemak: {goals.fatGoal}g
                    </span>
                  </div>
                </div>
                <div className="chart-wrapper">
                  <Doughnut
                    data={macronutrientData}
                    options={doughnutOptions}
                  />
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Distribusi per Waktu Makan</h3>
                  <select
                    value={barChartMetric}
                    onChange={(e) => setBarChartMetric(e.target.value)}
                    className="chart-filter"
                  >
                    <option value="calories">Kalori</option>
                    <option value="protein">Protein</option>
                    <option value="carbs">Karbohidrat</option>
                    <option value="fat">Lemak</option>
                  </select>
                </div>
                <div className="chart-wrapper">
                  <Bar data={barChartData} options={barChartOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION */}
          <div className="bottom-section">
            <div className="bottom-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Kalender Konsumsi</h3>
                </div>
                <div className="calendar-container">
                  <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    tileClassName={getTileClassName}
                    className="custom-calendar"
                  />
                  <div className="calendar-legend">
                    <div className="legend-item">
                      <span className="color-dot yellow"></span>
                      <span>Di Bawah Target</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-dot green"></span>
                      <span>Target Tercapai</span>
                    </div>
                    <div className="legend-item">
                      <span className="color-dot red"></span>
                      <span>Melebihi Target</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Makanan Paling Sering</h3>
                </div>
                <div className="frequent-foods-list">
                  {frequentFoods.length > 0 ? (
                    frequentFoods.map((item, index) => (
                      <div key={item.food} className="food-item">
                        <div className="food-rank">#{index + 1}</div>
                        <div className="food-info">
                          <div className="food-name">{item.food}</div>
                          <div className="food-count">{item.count} kali</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">📝</div>
                      <p>Belum ada data makanan</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h3>Insight & Rekomendasi</h3>
                </div>
                <div className="insights-container">
                  {patternAnalysis.insights.length > 0 ? (
                    <div className="insights-content">
                      <div className="insight-section">
                        <h4>📊 Analisis Hari Ini</h4>
                        {patternAnalysis.insights.map((insight, index) => (
                          <div key={index} className="insight-item">
                            {insight}
                          </div>
                        ))}
                      </div>
                      <div className="recommendation-section">
                        <h4>💡 Saran Perbaikan</h4>
                        {patternAnalysis.recommendations.map((rec, index) => (
                          <div key={index} className="recommendation-item">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        {selectedDateData ? "✅" : "📅"}
                      </div>
                      <p>
                        {selectedDateData
                          ? "Pola makan Anda sudah baik! Pertahankan konsistensi."
                          : "Belum ada data untuk dianalisis hari ini."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* GOALS TAB */}
      {activeTab === "goals" && (
        <div className="goals-tab">
          <div className="goals-header">
            <h2>🎯 Target Nutrisi Personal</h2>
            <p>Berdasarkan profil dan rekomendasi ahli gizi</p>
          </div>

          <div className="goals-grid">
            <div className="goal-card">
              <h3>🔥 Target Kalori</h3>
              <div className="goal-value">{goals.calorieGoal} kcal</div>
              <div className="goal-description">
                Kebutuhan harian berdasarkan profil Anda
              </div>
              <div className="goal-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: selectedDateData
                        ? `${Math.min(
                            (selectedDateData.calories / goals.calorieGoal) *
                              100,
                            100
                          )}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {selectedDateData ? selectedDateData.calories : 0} /{" "}
                  {goals.calorieGoal} kcal
                </span>
              </div>
            </div>

            <div className="goal-card">
              <h3>🥩 Target Protein</h3>
              <div className="goal-value">{goals.proteinGoal} g</div>
              <div className="goal-description">20-25% dari total kalori</div>
              <div className="goal-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill protein"
                    style={{
                      width: selectedDateData
                        ? `${Math.min(
                            (selectedDateData.protein / goals.proteinGoal) *
                              100,
                            100
                          )}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {selectedDateData ? Math.round(selectedDateData.protein) : 0}{" "}
                  / {goals.proteinGoal} g
                </span>
              </div>
            </div>

            <div className="goal-card">
              <h3>🌾 Target Karbohidrat</h3>
              <div className="goal-value">{goals.carbsGoal} g</div>
              <div className="goal-description">50-55% dari total kalori</div>
              <div className="goal-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill carbs"
                    style={{
                      width: selectedDateData
                        ? `${Math.min(
                            (selectedDateData.carbs / goals.carbsGoal) * 100,
                            100
                          )}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {selectedDateData ? Math.round(selectedDateData.carbs) : 0} /{" "}
                  {goals.carbsGoal} g
                </span>
              </div>
            </div>

            <div className="goal-card">
              <h3>🥑 Target Lemak</h3>
              <div className="goal-value">{goals.fatGoal} g</div>
              <div className="goal-description">25% dari total kalori</div>
              <div className="goal-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill fat"
                    style={{
                      width: selectedDateData
                        ? `${Math.min(
                            (selectedDateData.fat / goals.fatGoal) * 100,
                            100
                          )}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {selectedDateData ? Math.round(selectedDateData.fat) : 0} /{" "}
                  {goals.fatGoal} g
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REPORT TAB */}
      {activeTab === "weekly" && (
        <div className="weekly-report-tab">
          <div className="report-header">
            <h2>📈 Laporan Mingguan</h2>
            <p>Ringkasan performa nutrisi Anda selama 7 hari terakhir</p>
          </div>

          <div className="report-stats-grid">
            <div className="report-stat-card">
              <div className="report-stat-value">
                {weeklyReport.avgCalories}
              </div>
              <div className="report-stat-label">Rata-rata Kalori/Hari</div>
              <div className={`report-stat-trend ${weeklyReport.trend}`}>
                {weeklyReport.trend === "up"
                  ? "📈"
                  : weeklyReport.trend === "down"
                  ? "📉"
                  : "➡️"}
              </div>
            </div>

            <div className="report-stat-card">
              <div className="report-stat-value">
                {weeklyReport.consistency}%
              </div>
              <div className="report-stat-label">Konsistensi Target</div>
              <div className="report-stat-detail">
                {weeklyReport.daysMetGoal}/7 hari
              </div>
            </div>

            <div className="report-stat-card">
              <div className="report-stat-value">
                {weeklyReport.avgProtein}g
              </div>
              <div className="report-stat-label">Protein Harian</div>
              <div className="report-stat-detail">
                {Math.round(
                  (weeklyReport.avgProtein / goals.proteinGoal) * 100
                )}
                % dari target
              </div>
            </div>

            <div className="report-stat-card">
              <div className="report-stat-value">
                {weeklyReport.avgNutritionScore}%
              </div>
              <div className="report-stat-label">Skor Nutrisi Rata-rata</div>
              <div className="report-stat-detail">
                {weeklyReport.avgNutritionScore >= 80
                  ? "Excellent"
                  : weeklyReport.avgNutritionScore >= 60
                  ? "Good"
                  : "Perlu Perbaikan"}
              </div>
            </div>
          </div>

          <div className="report-details">
            <div className="detail-card">
              <h4>🎯 Pencapaian Mingguan</h4>
              <ul>
                <li>
                  Hari memenuhi target:{" "}
                  <strong>{weeklyReport.daysMetGoal}/7</strong>
                </li>
                <li>
                  Konsistensi: <strong>{weeklyReport.consistency}%</strong>
                </li>
                <li>
                  Rata-rata selisih kalori:{" "}
                  <strong>
                    {Math.abs(weeklyReport.avgCalories - calorieGoal)} kcal
                  </strong>
                </li>
                <li>
                  Trend:{" "}
                  <strong>
                    {weeklyReport.trend === "up"
                      ? "Naik"
                      : weeklyReport.trend === "down"
                      ? "Turun"
                      : "Stabil"}
                  </strong>
                </li>
              </ul>
            </div>

            <div className="detail-card">
              <h4>📊 Rata-rata Makronutrien</h4>
              <ul>
                <li>
                  Protein: <strong>{weeklyReport.avgProtein}g</strong> (target:{" "}
                  {goals.proteinGoal}g)
                </li>
                <li>
                  Karbohidrat: <strong>{weeklyReport.avgCarbs}g</strong>{" "}
                  (target: {goals.carbsGoal}g)
                </li>
                <li>
                  Lemak: <strong>{weeklyReport.avgFat}g</strong> (target:{" "}
                  {goals.fatGoal}g)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PREDICTIVE ANALYTICS TAB */}
      {activeTab === "predictive" && (
        <div className="predictive-tab">
          <div className="predictive-header">
            <h2>🔮 Predictive Analytics</h2>
            <p>
              Prediksi berdasarkan pola konsumsi Anda selama 30 hari terakhir
            </p>
          </div>

          {prediction ? (
            <div className="prediction-cards">
              <div className="prediction-card">
                <h3>📅 Prediksi Mingguan</h3>
                <div className={`prediction-value ${prediction.trend}`}>
                  {prediction.weeklyChange > 0 ? "+" : ""}
                  {prediction.weeklyChange.toFixed(2)} kg
                </div>
                <div className="prediction-label">
                  {prediction.trend === "gain"
                    ? "Kenaikan berat badan diprediksi"
                    : prediction.trend === "loss"
                    ? "Penurunan berat badan diprediksi"
                    : "Berat badan stabil"}
                </div>
              </div>

              <div className="prediction-card">
                <h3>📊 Prediksi Bulanan</h3>
                <div className={`prediction-value ${prediction.trend}`}>
                  {prediction.monthlyChange > 0 ? "+" : ""}
                  {prediction.monthlyChange.toFixed(2)} kg
                </div>
                <div className="prediction-label">
                  {Math.abs(prediction.monthlyChange) > 2
                    ? "Perubahan signifikan terdeteksi"
                    : "Perubahan bertahap"}
                </div>
              </div>

              <div className="prediction-card">
                <h3>💡 Rekomendasi</h3>
                <div className="recommendation-text">
                  {prediction.trend === "gain"
                    ? "Pertimbangkan untuk mengurangi asupan kalori sebanyak 200-300 kcal/hari"
                    : prediction.trend === "loss"
                    ? "Tingkatkan asupan kalori sebanyak 200-300 kcal/hari untuk maintenance"
                    : "Pertahankan pola makan Anda saat ini, sudah optimal!"}
                </div>
                <div className="confidence-level">
                  Tingkat kepercayaan: {Math.round(prediction.confidence)}%
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-prediction">
              <div className="empty-icon">📊</div>
              <p>Data tidak cukup untuk prediksi. Butuh minimal data 7 hari.</p>
            </div>
          )}

          <div className="prediction-info">
            <h4>ℹ️ Cara Kerja Prediksi</h4>
            <p>
              Prediksi berdasarkan rata-rata konsumsi kalori 30 hari terakhir
              dan prinsip bahwa 7700 kalori setara dengan 1 kg berat badan.
              Hasil prediksi dapat berubah berdasarkan metabolisme individu dan
              faktor lainnya.
            </p>
          </div>
        </div>
      )}

      {/* STYLES - FULL CSS TANPA DIKURANGI */}
      <style jsx>{`
        .analytics-container.modern {
          padding: clamp(12px, 3vw, 24px);
          background: #f8f9fa;
          min-height: 100vh;
          font-family: "Poppins", sans-serif;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        /* HEADER */
        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: clamp(16px, 4vw, 24px);
          padding-bottom: clamp(12px, 3vw, 20px);
          border-bottom: 1px solid #e9ecef;
          flex-wrap: wrap;
          gap: clamp(8px, 2vw, 16px);
          width: 100%;
        }

        .header-content {
          flex: 1 1 300px;
          min-width: 0;
        }

        .header-content h1 {
          color: #2c3e50;
          font-size: clamp(1.5rem, 4vw, 2.25rem);
          font-weight: 700;
          margin: 0 0 clamp(4px, 1vw, 8px) 0;
          line-height: 1.2;
          word-wrap: break-word;
        }

        .header-content p {
          color: #7f8c8d;
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          margin: 0 0 clamp(8px, 2vw, 12px) 0;
          font-weight: 400;
        }

        .user-profile-info {
          display: flex;
          gap: clamp(6px, 1.5vw, 12px);
          flex-wrap: wrap;
        }

        .profile-badge {
          background: #e3f2fd;
          color: #1976d2;
          padding: clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px);
          border-radius: 16px;
          font-size: clamp(0.75rem, 2vw, 0.85rem);
          font-weight: 500;
          white-space: nowrap;
        }

        .date-display {
          background: white;
          padding: clamp(8px, 2vw, 12px) clamp(12px, 3vw, 20px);
          border-radius: 12px;
          font-size: clamp(0.8rem, 2.2vw, 0.95rem);
          color: #2c3e50;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e9ecef;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* TABS */
        .analytics-tabs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(4px, 1vw, 8px);
          margin-bottom: clamp(16px, 4vw, 24px);
          background: white;
          padding: clamp(6px, 1.5vw, 8px);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .tab-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: clamp(10px, 2.5vw, 12px) clamp(8px, 2vw, 12px);
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 500;
          color: #7f8c8d;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: clamp(0.75rem, 2vw, 0.8rem);
          min-height: 60px;
        }

        .tab-button:hover {
          background: #f8f9fa;
          color: #2c3e50;
        }

        .tab-button.active {
          background: #3498db;
          color: white;
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .tab-icon {
          font-size: clamp(1rem, 3vw, 1.2rem);
        }

        .tab-text {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          font-weight: 500;
        }

        /* MAIN STATS */
        .main-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(8px, 2vw, 12px);
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .stat-card {
          background: white;
          padding: clamp(12px, 3vw, 16px);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f3f4;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .stat-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .stat-main {
          flex: 1;
        }

        .stat-value {
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 2px;
          line-height: 1;
        }

        .stat-value.positive {
          color: #27ae60;
        }
        .stat-value.negative {
          color: #e74c3c;
        }
        .stat-value.neutral {
          color: #3498db;
        }

        .stat-label {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #7f8c8d;
          font-weight: 500;
          margin-bottom: 2px;
        }

        .stat-source {
          font-size: clamp(0.6rem, 1.6vw, 0.65rem);
          color: #95a5a6;
        }

        .stat-icon {
          font-size: clamp(1.5rem, 4vw, 2rem);
          opacity: 0.8;
          flex-shrink: 0;
        }

        /* CHARTS SECTION */
        .charts-section {
          margin-bottom: clamp(20px, 5vw, 32px);
        }

        .chart-row {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 3vw, 16px);
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .chart-card {
          background: white;
          padding: clamp(16px, 3vw, 20px);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #f1f3f4;
        }

        .chart-card.large {
          width: 100%;
        }

        .chart-header {
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 2vw, 12px);
          margin-bottom: clamp(12px, 3vw, 16px);
        }

        .chart-header h3 {
          color: #2c3e50;
          font-size: clamp(0.9rem, 2.5vw, 1rem);
          font-weight: 600;
          margin: 0;
        }

        .macro-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .macro-item {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #7f8c8d;
          padding: 4px 8px;
          border-radius: 4px;
          background: #f8f9fa;
        }

        .macro-item.protein {
          border-left: 3px solid #3498db;
        }
        .macro-item.carbs {
          border-left: 3px solid #f1c40f;
        }
        .macro-item.fat {
          border-left: 3px solid #e74c3c;
        }

        .chart-filter {
          padding: clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px);
          border: 1px solid #e9ecef;
          border-radius: 6px;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          background: white;
          color: #2c3e50;
          cursor: pointer;
          outline: none;
          transition: border-color 0.3s ease;
          width: 100%;
          max-width: 200px;
        }

        .chart-filter:focus {
          border-color: #3498db;
        }

        .chart-wrapper {
          height: clamp(200px, 50vw, 250px);
          width: 100%;
        }

        /* BOTTOM SECTION */
        .bottom-section {
          margin-bottom: clamp(20px, 5vw, 32px);
        }

        .bottom-grid {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 3vw, 16px);
        }

        /* GOALS TAB */
        .goals-tab {
          background: white;
          padding: clamp(16px, 3vw, 20px);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .goals-header {
          text-align: center;
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .goals-header h2 {
          color: #2c3e50;
          margin: 0 0 clamp(4px, 1vw, 8px) 0;
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
        }

        .goals-header p {
          color: #7f8c8d;
          margin: 0;
          font-size: clamp(0.8rem, 2.2vw, 0.9rem);
        }

        .goals-grid {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 3vw, 16px);
        }

        .goal-card {
          background: #f8f9fa;
          padding: clamp(16px, 3vw, 20px);
          border-radius: 10px;
          border: 1px solid #e9ecef;
        }

        .goal-card h3 {
          margin: 0 0 clamp(8px, 2vw, 12px) 0;
          color: #2c3e50;
          font-size: clamp(0.9rem, 2.5vw, 1rem);
        }

        .goal-value {
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
          font-weight: 700;
          color: #3498db;
          margin-bottom: clamp(4px, 1vw, 6px);
        }

        .goal-description {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #7f8c8d;
          margin-bottom: clamp(8px, 2vw, 12px);
        }

        .goal-progress {
          margin-bottom: clamp(8px, 2vw, 12px);
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .progress-fill {
          height: 100%;
          background: #27ae60;
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-fill.protein {
          background: #e74c3c;
        }

        .progress-fill.carbs {
          background: #f1c40f;
        }

        .progress-fill.fat {
          background: #9b59b6;
        }

        .progress-text {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #7f8c8d;
        }

        /* WEEKLY REPORT */
        .weekly-report-tab {
          background: white;
          padding: clamp(16px, 3vw, 20px);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .report-header {
          text-align: center;
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .report-header h2 {
          color: #2c3e50;
          margin: 0 0 clamp(4px, 1vw, 8px) 0;
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
        }

        .report-header p {
          color: #7f8c8d;
          margin: 0;
          font-size: clamp(0.8rem, 2.2vw, 0.9rem);
        }

        .report-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(8px, 2vw, 12px);
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .report-stat-card {
          background: #f8f9fa;
          padding: clamp(12px, 3vw, 16px);
          border-radius: 10px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .report-stat-value {
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: clamp(4px, 1vw, 6px);
        }

        .report-stat-label {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #7f8c8d;
          margin-bottom: clamp(4px, 1vw, 6px);
        }

        .report-stat-detail {
          font-size: clamp(0.65rem, 1.6vw, 0.7rem);
          color: #95a5a6;
        }

        .report-stat-trend.up {
          color: #e74c3c;
        }
        .report-stat-trend.down {
          color: #27ae60;
        }

        .report-details {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 3vw, 16px);
        }

        .detail-card {
          background: #f8f9fa;
          padding: clamp(12px, 3vw, 16px);
          border-radius: 10px;
          border: 1px solid #e9ecef;
        }

        .detail-card h4 {
          margin: 0 0 clamp(8px, 2vw, 12px) 0;
          color: #2c3e50;
          font-size: clamp(0.9rem, 2.5vw, 1rem);
        }

        .detail-card ul {
          margin: 0;
          padding-left: 16px;
        }

        .detail-card li {
          margin-bottom: clamp(4px, 1vw, 6px);
          color: #7f8c8d;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
        }

        /* PREDICTIVE ANALYTICS */
        .predictive-tab {
          background: white;
          padding: clamp(16px, 3vw, 20px);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .predictive-header {
          text-align: center;
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .predictive-header h2 {
          color: #2c3e50;
          margin: 0 0 clamp(4px, 1vw, 8px) 0;
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
        }

        .predictive-header p {
          color: #7f8c8d;
          margin: 0;
          font-size: clamp(0.8rem, 2.2vw, 0.9rem);
        }

        .prediction-cards {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 3vw, 16px);
          margin-bottom: clamp(16px, 4vw, 24px);
        }

        .prediction-card {
          background: #f8f9fa;
          padding: clamp(16px, 3vw, 20px);
          border-radius: 10px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .prediction-card h3 {
          margin: 0 0 clamp(8px, 2vw, 12px) 0;
          color: #2c3e50;
          font-size: clamp(0.9rem, 2.5vw, 1rem);
        }

        .prediction-value {
          font-size: clamp(1.25rem, 3.5vw, 1.5rem);
          font-weight: 700;
          margin-bottom: clamp(4px, 1vw, 6px);
        }

        .prediction-value.gain {
          color: #e74c3c;
        }
        .prediction-value.loss {
          color: #27ae60;
        }

        .prediction-label {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #7f8c8d;
        }

        .recommendation-text {
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #2c3e50;
          line-height: 1.4;
        }

        .confidence-level {
          font-size: clamp(0.65rem, 1.6vw, 0.7rem);
          color: #95a5a6;
          margin-top: 8px;
          font-style: italic;
        }

        .empty-prediction {
          text-align: center;
          padding: clamp(40px, 10vw, 60px) clamp(16px, 4vw, 20px);
          color: #95a5a6;
        }

        .empty-prediction .empty-icon {
          font-size: clamp(2rem, 6vw, 3rem);
          margin-bottom: clamp(8px, 2vw, 12px);
          opacity: 0.5;
        }

        .prediction-info {
          background: #e3f2fd;
          padding: clamp(12px, 3vw, 16px);
          border-radius: 10px;
          border-left: 4px solid #3498db;
        }

        .prediction-info h4 {
          margin: 0 0 clamp(4px, 1vw, 6px) 0;
          color: #2c3e50;
          font-size: clamp(0.9rem, 2.5vw, 1rem);
        }

        .prediction-info p {
          margin: 0;
          color: #34495e;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          line-height: 1.4;
        }

        /* CALENDAR */
        .calendar-container {
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 2vw, 12px);
        }

        .custom-calendar {
          width: 100% !important;
          border: none !important;
          font-family: "Poppins", sans-serif !important;
          background: transparent !important;
        }

        .custom-calendar .react-calendar__tile {
          border-radius: 6px !important;
          margin: 1px !important;
          transition: all 0.3s ease !important;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem) !important;
          padding: 8px 4px !important;
        }

        .custom-calendar .react-calendar__navigation button {
          border-radius: 6px !important;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem) !important;
          transition: all 0.3s ease !important;
          padding: 8px !important;
        }

        .custom-calendar .react-calendar__navigation button:hover,
        .custom-calendar .react-calendar__tile:enabled:hover {
          background-color: #f8f9fa !important;
        }

        .calendar-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          color: #2c3e50;
        }

        .color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }

        .color-dot.green {
          background-color: #27ae60;
        }
        .color-dot.yellow {
          background-color: #f39c12;
        }
        .color-dot.red {
          background-color: #e74c3c;
        }

        /* FREQUENT FOODS */
        .frequent-foods-list {
          display: flex;
          flex-direction: column;
          gap: clamp(6px, 1.5vw, 8px);
        }

        .food-item {
          display: flex;
          align-items: center;
          gap: clamp(8px, 2vw, 10px);
          padding: clamp(10px, 2.5vw, 12px);
          background: #f8f9fa;
          border-radius: 8px;
          transition: background-color 0.3s ease;
        }

        .food-item:hover {
          background: #e9ecef;
        }

        .food-rank {
          background: #3498db;
          color: white;
          width: clamp(24px, 6vw, 28px);
          height: clamp(24px, 6vw, 28px);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          font-weight: 600;
          flex-shrink: 0;
        }

        .food-info {
          flex: 1;
          min-width: 0;
        }

        .food-name {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 2px;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          word-break: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .food-count {
          font-size: clamp(0.65rem, 1.6vw, 0.7rem);
          color: #7f8c8d;
        }

        /* INSIGHTS */
        .insights-container {
          height: 100%;
        }

        .insights-content {
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 2vw, 12px);
        }

        .insight-section h4,
        .recommendation-section h4 {
          color: #2c3e50;
          margin: 0 0 clamp(6px, 1.5vw, 8px) 0;
          font-size: clamp(0.8rem, 2.2vw, 0.85rem);
          font-weight: 600;
        }

        .insight-item,
        .recommendation-item {
          padding: clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px);
          margin-bottom: clamp(4px, 1vw, 6px);
          border-radius: 6px;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          line-height: 1.4;
        }

        .insight-item {
          background: #fff3cd;
          border-left: 3px solid #f39c12;
          color: #856404;
        }

        .recommendation-item {
          background: #d1ecf1;
          border-left: 3px solid #17a2b8;
          color: #0c5460;
        }

        /* EMPTY STATES */
        .empty-state {
          text-align: center;
          padding: clamp(20px, 5vw, 30px) clamp(12px, 3vw, 16px);
          color: #95a5a6;
        }

        .empty-icon {
          font-size: clamp(1.5rem, 4vw, 2rem);
          margin-bottom: clamp(6px, 1.5vw, 8px);
          opacity: 0.5;
        }

        .empty-state p {
          margin: 0;
          font-style: italic;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
        }

        /* CALENDAR COLOR CLASSES */
        .calorie-red {
          background-color: #e74c3c !important;
          color: white !important;
          border-radius: 50% !important;
        }

        .calorie-green {
          background-color: #27ae60 !important;
          color: white !important;
          border-radius: 50% !important;
        }

        .calorie-yellow {
          background-color: #f39c12 !important;
          color: white !important;
          border-radius: 50% !important;
        }

        /* RESPONSIVE DESIGN */
        @media (min-width: 768px) {
          .analytics-tabs {
            grid-template-columns: repeat(4, 1fr);
          }

          .main-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .chart-row:last-child {
            flex-direction: row;
          }

          .chart-row:last-child .chart-card {
            flex: 1;
          }

          .bottom-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }

          .goals-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }

          .report-stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .report-details {
            flex-direction: row;
          }

          .prediction-cards {
            flex-direction: row;
          }

          .calendar-legend {
            flex-direction: row;
            justify-content: center;
          }
        }

        @media (min-width: 1024px) {
          .main-stats-grid {
            gap: 16px;
          }

          .stat-card {
            padding: 20px;
          }

          .stat-value {
            font-size: 1.75rem;
          }

          .chart-wrapper {
            height: 300px;
          }
        }

        @media (max-width: 480px) {
          .analytics-header {
            flex-direction: column;
            align-items: stretch;
          }

          .date-display {
            text-align: center;
          }

          .user-profile-info {
            justify-content: center;
          }
        }

        @media (max-width: 360px) {
          .main-stats-grid {
            grid-template-columns: 1fr;
          }

          .report-stats-grid {
            grid-template-columns: 1fr;
          }

          .analytics-tabs {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Analytics;

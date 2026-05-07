import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

// ================================
// FUNGSI UTILITAS BERDASARKAN WHO
// ================================

// Fungsi menghitung kebutuhan kalori berdasarkan WHO & Harris-Benedict
const calculateCalorieGoal = (user) => {
  // Cegah error jika user null/undefined
  if (!user) return 2000;

  const {
    gender,
    weight,
    height,
    age, // Mengambil umur asli (angka) dari input user
    ageCategory, // Tetap diambil untuk aturan diskon (Rule-Based)
    activityLevel = "sedentary", // Default jika data kosong
  } = user;

  // Validasi data dasar
  if (!gender || !weight || !height) return 2000;

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

  // Rumus Harris-Benedict (Revised 1984 - Standar Klinis)
  // Menggunakan exactAge agar perhitungan presisi sesuai input user
  let bmr = 0;
  if (gender === "Male") {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * exactAge;
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * exactAge;
  }

  // === LOGIKA ACTIVITY LEVEL (PAL) ===
  const activityMultipliers = {
    sedentary: 1.2, // Tidak banyak bergerak
    light: 1.375, // Ringan (1-3 hari)
    moderate: 1.55, // Sedang (3-5 hari)
    active: 1.725, // Berat (6-7 hari)
    extreme: 1.9, // Ekstrem (Atlet/Fisik berat)
  };

  // Ambil multiplier
  const activityFactor = activityMultipliers[activityLevel] || 1.2;

  let tdee = bmr * activityFactor;

  // === PENYESUAIAN BERDASARKAN KATEGORI (RULE-BASED) ===
  // Meskipun BMR sudah pakai umur asli, standar WHO menyarankan
  // penyesuaian metabolisme tambahan untuk kelompok usia rentan.
  switch (ageCategory) {
    case "balita":
      return 1350; // Standar WHO Anak (BMR dewasa tidak valid disini)
    case "anak_kecil":
      return 1550;
    case "anak_anak":
      return 1700;
    case "remaja_awal":
      return 2100; // Boost untuk pertumbuhan
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

// Fungsi menghitung target makronutrien berdasarkan WHO
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
    // Remaja: lebih banyak protein untuk pertumbuhan
    proteinPercentage = 0.25; // 25%
    carbPercentage = 0.5; // 50%
    fatPercentage = 0.25; // 25%
  } else if (ageCategory === "lansia" || ageCategory === "pra_lansia") {
    // Lansia: lebih banyak protein untuk menjaga massa otot
    proteinPercentage = 0.25; // 25%
    carbPercentage = 0.5; // 50%
    fatPercentage = 0.25; // 25%
  } else {
    // Dewasa: distribusi seimbang WHO
    proteinPercentage = 0.2; // 20%
    carbPercentage = 0.55; // 55%
    fatPercentage = 0.25; // 25%
  }

  return {
    protein: Math.round((calorieGoal * proteinPercentage) / 4),
    carbs: Math.round((calorieGoal * carbPercentage) / 4),
    fat: Math.round((calorieGoal * fatPercentage) / 9),
  };
};

// ================================
// KOMPONEN UI: PROGRESS BAR
// ================================
const MacroProgressBar = ({ label, value, goal, color, unit = "g" }) => {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

  return (
    <div style={styles.macroItem}>
      <div style={styles.macroInfo}>
        <span style={styles.macroLabel}>{label}</span>
        <span style={styles.macroValues}>
          {Math.round(value)} / {goal} {unit}
        </span>
      </div>
      <div style={styles.progressBarBackground}>
        <div
          style={{
            ...styles.progressBarFill,
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        ></div>
      </div>
      <div style={styles.progressPercentage}>{Math.round(percentage)}%</div>
    </div>
  );
};

// ================================
// KOMPONEN UI: PIE CHART SKOR
// ================================
const NutritionScorePie = ({ score, date, isToday = false }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (score) => {
    if (score >= 80) return "#27ae60";
    if (score >= 60) return "#f39c12";
    return "#e74c3c";
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hari Ini";
    if (date.toDateString() === yesterday.toDateString()) return "Kemarin";

    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    return days[date.getDay()];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return "Baik";
    if (score >= 60) return "Cukup";
    return "Kurang";
  };

  return (
    <div
      style={{
        ...styles.nutritionScorePie,
        ...(isToday && styles.nutritionScorePieToday),
      }}
    >
      <div style={styles.pieHeader}>
        <span style={styles.dayName}>{getDayName(date)}</span>
        <span style={styles.date}>{formatDate(date)}</span>
      </div>

      <div style={styles.pieContainer}>
        <svg width="70" height="70" viewBox="0 0 70 70">
          <circle
            cx="35"
            cy="35"
            r={radius}
            fill="none"
            stroke="#e9ecef"
            strokeWidth="6"
          />
          <circle
            cx="35"
            cy="35"
            r={radius}
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 35 35)"
          />
        </svg>

        <div style={styles.pieCenter}>
          <span style={styles.scoreValue}>{score}</span>
        </div>
      </div>

      <div style={styles.scoreMessage}>
        <span style={{ color: getScoreColor(score) }}>
          {getScoreMessage(score)}
        </span>
      </div>
    </div>
  );
};

// ================================
// KOMPONEN UI: WEEKLY SCORE SECTION
// ================================
const WeeklyScoreSection = ({ weeklyScores }) => {
  const averageScore = Math.round(
    weeklyScores.reduce((sum, day) => sum + day.score, 0) / weeklyScores.length
  );

  return (
    <div style={styles.weeklyScoreSection}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>Skor Nutrisi 7 Hari</h3>
        <div style={styles.averageBadge}>Rata: {averageScore}</div>
      </div>

      <div style={styles.weeklyScoreGrid}>
        {weeklyScores.map((dayScore, index) => (
          <NutritionScorePie
            key={dayScore.date}
            score={dayScore.score}
            date={dayScore.date}
            isToday={index === 6}
          />
        ))}
      </div>
    </div>
  );
};

// ================================
// KOMPONEN UI: HEALTH METRICS PANEL
// ================================
const HealthMetricsPanel = ({ user, onNavigate }) => {
  const calculateBMI = () => {
    if (!user?.weight || !user?.height) return null;
    const bmi = (user.weight / (user.height / 100) ** 2).toFixed(1);
    return parseFloat(bmi);
  };

  const getBMICategory = (bmi) => {
    // Klasifikasi WHO untuk populasi Asia
    if (bmi < 18.5)
      return {
        category: "Kurus",
        color: "#e74c3c",
        icon: "⚠️",
        advice: "Tingkatkan asupan kalori dan nutrisi sesuai rekomendasi WHO.",
      };
    if (bmi < 22.9)
      return {
        category: "Normal Ideal",
        color: "#27ae60",
        icon: "✅",
        advice:
          "Pertahankan pola makan sehat dan aktivitas fisik sesuai pedoman WHO.",
      };
    if (bmi < 24.9)
      return {
        category: "Normal",
        color: "#2ecc71",
        icon: "👍",
        advice: "Tetap jaga pola makan seimbang dan aktivitas fisik rutin.",
      };
    if (bmi < 29.9)
      return {
        category: "Gemuk",
        color: "#f39c12",
        icon: "📈",
        advice:
          "Perhatikan asupan kalori dan tingkatkan aktivitas fisik sesuai saran WHO.",
      };
    return {
      category: "Obesitas",
      color: "#c0392b",
      icon: "🚨",
      advice: "Sangat disarankan untuk berkonsultasi dengan ahli gizi.",
    };
  };

  const calculateBMR = () => {
    if (!user?.weight || !user?.height || !user?.gender) return null;

    // Gunakan age asli jika ada, jika tidak fallback ke kategori
    let exactAge = user.age;
    if (!exactAge && user.ageCategory) {
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
      exactAge = ageMap[user.ageCategory] || 30;
    }
    if (!exactAge) exactAge = 30;

    // Rumus WHO yang disesuaikan
    if (user.gender === "Male") {
      return Math.round(
        88.362 + 13.397 * user.weight + 4.799 * user.height - 5.677 * exactAge
      );
    } else {
      return Math.round(
        447.593 + 9.247 * user.weight + 3.098 * user.height - 4.33 * exactAge
      );
    }
  };

  // Helper untuk Label Aktivitas yang sesuai dengan Input Register
  const getActivityLabel = (level) => {
    // Mapping label yang lebih informatif untuk UI
    const labels = {
      sedentary: "Sedentary (Jarang Olahraga)",
      light: "Light (1-3 hari/minggu)",
      moderate: "Moderate (3-5 hari/minggu)",
      active: "Active (6-7 hari/minggu)",
      extreme: "Extreme (Fisik Berat/Atlet)",
    };
    return labels[level] || "Sedentary";
  };

  const bmi = calculateBMI();
  const bmiData = bmi ? getBMICategory(parseFloat(bmi)) : null;
  const bmr = calculateBMR();
  const calorieGoal = calculateCalorieGoal(user);

  return (
    <div style={styles.healthMetricsPanel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>
          <span style={styles.panelIcon}>📊</span>
          <h3 style={styles.panelTitleText}>Profil Kesehatan</h3>
        </div>
        <button
          style={styles.editProfileBtn}
          onClick={() => onNavigate("profile")}
        >
          <span style={styles.btnIcon}>✏️</span>
          Edit
        </button>
      </div>

      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>⚖️</div>
          <div style={styles.metricContent}>
            <div style={styles.metricLabel}>Berat</div>
            <div style={styles.metricValue}>{user?.weight || "-"} kg</div>
            <div style={styles.metricSource}>WHO Standard</div>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>📏</div>
          <div style={styles.metricContent}>
            <div style={styles.metricLabel}>Tinggi</div>
            <div style={styles.metricValue}>{user?.height || "-"} cm</div>
            <div style={styles.metricSource}>WHO Standard</div>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>
            {user?.gender === "Male" ? "♂️" : "♀️"}
          </div>
          <div style={styles.metricContent}>
            <div style={styles.metricLabel}>Gender</div>
            <div style={styles.metricValue}>
              {user?.gender === "Male" ? "Laki" : "Perempuan"}
            </div>
            <div style={styles.metricSource}>WHO Standard</div>
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🎂</div>
          <div style={styles.metricContent}>
            <div style={styles.metricLabel}>Usia</div>
            <div style={styles.metricValue}>
              {/* Tampilkan Umur Asli (Angka) */}
              {user?.age ? `${user.age} Tahun` : "-"}
            </div>
            <div style={styles.metricSource}>WHO Standard</div>
          </div>
        </div>

        {/* Kartu Aktivitas Fisik */}
        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🏃</div>
          <div style={styles.metricContent}>
            <div style={styles.metricLabel}>Aktivitas</div>
            <div style={{ ...styles.metricValue, fontSize: "0.85rem" }}>
              {/* Menggunakan data user.activityLevel */}
              {getActivityLabel(user?.activityLevel || "sedentary")}
            </div>
            <div style={styles.metricSource}>PAL Factor</div>
          </div>
        </div>

        {bmi && (
          <div style={{ ...styles.metricCard, ...styles.metricCardHighlight }}>
            <div style={styles.metricIcon}>{bmiData.icon}</div>
            <div style={styles.metricContent}>
              <div style={styles.metricLabel}>BMI</div>
              <div style={{ ...styles.metricValue, color: bmiData.color }}>
                {bmi}
              </div>
              <div style={{ ...styles.metricCategory, color: bmiData.color }}>
                {bmiData.category}
              </div>
              <div style={styles.metricSource}>WHO Asia Standard</div>
            </div>
          </div>
        )}

        {bmr && (
          <div style={styles.metricCard}>
            <div style={styles.metricIcon}>🔥</div>
            <div style={styles.metricContent}>
              <div style={styles.metricLabel}>BMR</div>
              <div style={styles.metricValue}>{bmr} kkal</div>
              <div style={styles.metricSource}>Harris-Benedict</div>
            </div>
          </div>
        )}

        <div style={styles.metricCard}>
          <div style={styles.metricIcon}>🎯</div>
          <div style={styles.metricContent}>
            <div style={styles.metricLabel}>Target Kalori</div>
            <div style={styles.metricValue}>{calorieGoal} kkal</div>
            <div style={styles.metricSource}>BMR x PAL</div>
          </div>
        </div>
      </div>

      {bmiData && (
        <div style={styles.healthInsights}>
          <div style={styles.insightHeader}>
            <h4 style={styles.insightTitle}>
              <span style={styles.insightIcon}>💡</span>
              Insight Kesehatan WHO
            </h4>
            <div style={{ ...styles.bmiStatus, color: bmiData.color }}>
              {bmiData.icon} {bmiData.category}
            </div>
          </div>
          <p style={styles.insightAdvice}>{bmiData.advice}</p>
          <div style={styles.whoReference}>
            * Berdasarkan pedoman World Health Organization
          </div>
        </div>
      )}

      {(!user?.weight || !user?.height) && (
        <div style={styles.incompleteDataWarning}>
          <div style={styles.warningContent}>
            <div style={styles.warningIcon}>📝</div>
            <div style={styles.warningText}>
              <h4 style={styles.warningTitle}>Lengkapi Profil</h4>
              <p style={styles.warningDescription}>
                Lengkapi data berat dan tinggi badan untuk analisis WHO yang
                akurat
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("profile")}
            style={styles.completeProfileBtn}
          >
            Lengkapi
          </button>
        </div>
      )}
    </div>
  );
};

// ================================
// KOMPONEN UI: FOOD LOG LIST
// ================================
const FoodLogList = ({ todayLogs, onEdit, onDelete }) => {
  const [activeMeal, setActiveMeal] = React.useState("Breakfast");

  const groupedLogs = todayLogs.reduce((acc, log) => {
    const meal = log.mealType;
    if (!acc[meal]) acc[meal] = [];
    acc[meal].push(log);
    return acc;
  }, {});

  const mealDetails = {
    Breakfast: { title: "Sarapan", icon: "☀️", color: "#FFA726" },
    Lunch: { title: "Siang", icon: "🍗", color: "#4CAF50" },
    Dinner: { title: "Malam", icon: "🌙", color: "#2196F3" },
    Snacks: { title: "Cemilan", icon: "🍿", color: "#9C27B0" },
  };

  const handleDeleteClick = (log) => {
    Swal.fire({
      title: "Hapus Makanan?",
      text: `"${log.foodName}" akan dihapus permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(log._id);
        Swal.fire("Dihapus!", "Makanan telah dihapus.", "success");
      }
    });
  };

  if (todayLogs.length === 0) {
    return (
      <div style={styles.emptyLog}>
        <div style={styles.emptyIcon}>🍽️</div>
        <div style={styles.emptyText}>
          <p style={styles.emptyMessage}>Belum ada makanan hari ini</p>
          <p style={styles.emptySubtitle}>Tambahkan makanan pertama Anda!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.foodLogContainer}>
      {/* Meal Type Navigation */}
      <div style={styles.mealNavigation}>
        {Object.keys(mealDetails).map((mealType) => (
          <button
            key={mealType}
            style={{
              ...styles.mealTab,
              borderColor: mealDetails[mealType].color,
              backgroundColor:
                activeMeal === mealType
                  ? mealDetails[mealType].color
                  : "transparent",
              color: activeMeal === mealType ? "white" : "#2c3e50",
            }}
            onClick={() => setActiveMeal(mealType)}
          >
            <span style={styles.mealTabIcon}>{mealDetails[mealType].icon}</span>
            <span style={styles.mealTabTitle}>
              {mealDetails[mealType].title}
            </span>
            <span style={styles.mealTabCount}>
              ({groupedLogs[mealType]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Food Items for Active Meal */}
      <div style={styles.foodItemsContainer}>
        {groupedLogs[activeMeal] && groupedLogs[activeMeal].length > 0 ? (
          <div style={styles.foodItemsList}>
            {groupedLogs[activeMeal].map((log) => (
              <div key={log._id} style={styles.foodItemCard}>
                <div style={styles.foodItemMain}>
                  <div style={styles.foodItemHeader}>
                    <h4 style={styles.foodName}>{log.foodName}</h4>
                    <div style={styles.foodCalories}>
                      {Math.round(log.calories)} kkal
                    </div>
                  </div>

                  <div style={styles.foodMacros}>
                    <span style={styles.macroBadgeProtein}>
                      P: {Math.round(log.protein)}g
                    </span>
                    <span style={styles.macroBadgeCarb}>
                      K: {Math.round(log.carbohydrates)}g
                    </span>
                    <span style={styles.macroBadgeFat}>
                      L: {Math.round(log.fat)}g
                    </span>
                  </div>
                </div>

                <div style={styles.foodItemActions}>
                  <button
                    onClick={() => onEdit(log)}
                    style={styles.actionBtnEdit}
                    title="Edit"
                  >
                    <span>✏️</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(log)}
                    style={styles.actionBtnDelete}
                    title="Hapus"
                  >
                    <span>🗑️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyMeal}>
            <div style={styles.emptyMealIcon}>
              {mealDetails[activeMeal].icon}
            </div>
            <div style={styles.emptyMealText}>
              <p style={styles.emptyMealMessage}>
                Belum ada {mealDetails[activeMeal].title.toLowerCase()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Summary */}
      <div style={styles.mealSummary}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total:</span>
          <span style={styles.summaryValue}>
            {groupedLogs[activeMeal]?.length || 0} item
          </span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Kalori:</span>
          <span style={styles.summaryValue}>
            {Math.round(
              groupedLogs[activeMeal]?.reduce(
                (sum, log) => sum + log.calories,
                0
              ) || 0
            )}{" "}
            kkal
          </span>
        </div>
      </div>
    </div>
  );
};

// ================================
// KOMPONEN UTAMA: DASHBOARD
// ================================
const Dashboard = ({ foodLogs = [], user, onDelete, onEdit, onNavigate }) => {
  // ======================
  // FUNGSI UTILITAS WAKTU
  // ======================
  const getWIBDate = () => {
    const now = new Date();
    const wibOffset = 7 * 60;
    const localOffset = now.getTimezoneOffset();
    return new Date(now.getTime() + (wibOffset + localOffset) * 60000);
  };

  // State untuk Realtime Clock
  const [currentWIB, setCurrentWIB] = useState(getWIBDate());

  // Effect untuk update waktu setiap 1 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentWIB(getWIBDate());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentWIB.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 18) return "Selamat Siang";
    return "Selamat Malam";
  };

  // ======================
  // PERHITUNGAN DATA BERDASARKAN WHO - TERINTEGRASI
  // ======================
  const todayString = currentWIB.toLocaleDateString("en-CA");

  const todayLogs = foodLogs.filter((log) => {
    const logDate = new Date(log.date);
    const logDateWIB = new Date(
      logDate.getTime() + (7 * 60 + logDate.getTimezoneOffset()) * 60000
    );
    return logDateWIB.toLocaleDateString("en-CA") === todayString;
  });

  // Hitung totals dari todayLogs - SUMBER DATA TUNGGAL
  const totals = todayLogs.reduce(
    (acc, log) => {
      acc.totalCalories += log.calories;
      acc.totalProtein += log.protein;
      acc.totalCarbs += log.carbohydrates;
      acc.totalFat += log.fat;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );

  // Goals berdasarkan WHO - DIHITUNG SEKALI
  const calorieGoal = calculateCalorieGoal(user);
  const macroGoals = calculateMacroGoals(user, calorieGoal);

  const dailyGoals = {
    calories: calorieGoal,
    protein: macroGoals.protein,
    carbs: macroGoals.carbs,
    fat: macroGoals.fat,
  };

  // Progress kalori - BERDASARKAN DATA YANG SAMA
  const calorieProgress =
    dailyGoals.calories > 0
      ? (totals.totalCalories / dailyGoals.calories) * 100
      : 0;

  // Hitung skor nutrisi yang TERINTEGRASI dengan data yang sama
  const calculateDailyNutritionScore = (dateString) => {
    const dayLogs = foodLogs.filter((log) => {
      const logDate = new Date(log.date);
      const logDateWIB = new Date(
        logDate.getTime() + (7 * 60 + logDate.getTimezoneOffset()) * 60000
      );
      return logDateWIB.toLocaleDateString("en-CA") === dateString;
    });

    if (dayLogs.length === 0) return 0;

    // Gunakan perhitungan yang sama dengan totals
    const dayTotals = dayLogs.reduce(
      (acc, log) => {
        acc.calories += log.calories;
        acc.protein += log.protein;
        acc.carbs += log.carbohydrates;
        acc.fat += log.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    let totalScore = 0;

    // 1. Skor Kalori (40% bobot) - PENGHITUNGAN YANG LEBIH AKURAT
    const calorieDeviation = Math.abs(dayTotals.calories - calorieGoal);
    const calorieTolerance = calorieGoal * 0.15; // Toleransi 15%

    let calorieScore = 0;
    if (calorieDeviation <= calorieTolerance) {
      calorieScore = 100; // Dalam toleransi
    } else {
      // Semakin jauh dari target, semakin rendah skor - PERBAIKAN: Penalty lebih realistis
      const excessRatio = Math.min(calorieDeviation / calorieGoal, 1.0);
      calorieScore = Math.max(0, 100 - excessRatio * 60); // Penalty lebih besar
    }
    totalScore += calorieScore * 0.4;

    // 2. Skor Makronutrien (60% bobot total - 20% masing-masing)
    const macroScores = {
      protein: calculateMacroScore(dayTotals.protein, macroGoals.protein),
      carbs: calculateMacroScore(dayTotals.carbs, macroGoals.carbs),
      fat: calculateMacroScore(dayTotals.fat, macroGoals.fat),
    };

    totalScore += macroScores.protein * 0.2;
    totalScore += macroScores.carbs * 0.2;
    totalScore += macroScores.fat * 0.2;

    // 3. Bonus/Penalty berdasarkan keseimbangan makronutrien
    const balanceBonus = calculateMacroBalanceBonus(dayTotals, macroGoals);
    totalScore += balanceBonus;

    // Pastikan skor antara 0-100
    return Math.max(0, Math.min(100, Math.round(totalScore)));
  };

  // Fungsi helper untuk menghitung skor makronutrien individu - PERBAIKAN LOGIKA
  const calculateMacroScore = (actual, target) => {
    if (target === 0) return 100;

    const ratio = actual / target;

    // PERBAIKAN: Range yang lebih ketat dan progresif
    if (ratio >= 0.9 && ratio <= 1.1) {
      return 100; // Range ideal 90-110%
    } else if (ratio >= 0.8 && ratio <= 1.2) {
      return 80; // Range acceptable 80-120%
    } else if (ratio < 0.8) {
      // PERBAIKAN: Penalty lebih besar untuk kekurangan signifikan
      return Math.max(0, (ratio / 0.8) * 80);
    } else {
      // PERBAIKAN: Penalty lebih besar untuk kelebihan signifikan
      return Math.max(0, 100 - ((ratio - 1.2) / 0.3) * 30);
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

    // Target rasio berdasarkan WHO
    const targetProteinRatio = 0.2; // 20%
    const targetCarbRatio = 0.55; // 55%
    const targetFatRatio = 0.25; // 25%

    const proteinDeviation = Math.abs(proteinRatio - targetProteinRatio);
    const carbDeviation = Math.abs(carbRatio - targetCarbRatio);
    const fatDeviation = Math.abs(fatRatio - targetFatRatio);

    const totalDeviation = proteinDeviation + carbDeviation + fatDeviation;

    // Bonus maksimal 10 poin, penalty maksimal -10 poin
    if (totalDeviation < 0.1) return 10; // Sangat seimbang
    if (totalDeviation < 0.2) return 5; // Cukup seimbang
    if (totalDeviation > 0.4) return -10; // Tidak seimbang
    if (totalDeviation > 0.3) return -5; // Agak tidak seimbang

    return 0; // Netral
  };

  const getLast7DaysWIB = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentWIB);
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString("en-CA"));
    }
    return days;
  };

  // ======================
  // DATA YANG DITAMPILKAN BERDASARKAN WHO - TERINTEGRASI
  // ======================
  const last7Days = getLast7DaysWIB();
  const weeklyScores = last7Days.map((date) => ({
    date,
    score: calculateDailyNutritionScore(date),
  }));

  // Skor nutrisi hari ini - BERDASKKAN DATA YANG SAMA
  const currentNutritionScore = calculateDailyNutritionScore(todayString);

  // ======================
  // RENDER KOMPONEN
  // ======================
  return (
    <div style={styles.dashboardContainer}>
      {/* HEADER */}
      <div style={styles.dashboardHeader}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>
            {getGreeting()},{" "}
            <span style={styles.userFirstname}>
              {user ? user.name.split(" ")[0] : ""}!
            </span>
          </h1>
          <p style={styles.headerSubtitle}>
            Dashboard nutrisi berdasarkan rekomendasi WHO
          </p>
          {user && (
            <div style={styles.userInfo}>
              <span style={styles.userDetail}>
                🎯 {dailyGoals.calories} kkal/hari
              </span>
              <span style={styles.userDetail}>📊 Berdasarkan WHO</span>
            </div>
          )}
        </div>
        <div style={styles.timeInfo}>
          <span>
            {currentWIB.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            WIB
          </span>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={styles.dashboardGrid}>
        {/* LEFT COLUMN - STATS & SCORES */}
        <div style={styles.leftColumn}>
          {/* Weekly Score Section */}
          <div style={styles.card}>
            <WeeklyScoreSection weeklyScores={weeklyScores} />
          </div>

          {/* Stats Row - Kalori & Makronutrien */}
          <div style={styles.statsGrid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Kalori Hari Ini</h3>
                <span style={styles.goalInfo}>
                  Target: {dailyGoals.calories} kkal
                </span>
              </div>
              <div style={styles.calorieGauge}>
                <div
                  style={{
                    ...styles.gaugeCircle,
                    background: `conic-gradient(#20c997 ${calorieProgress}%, #e9ecef ${calorieProgress}%)`,
                  }}
                >
                  <div style={styles.gaugeCenter}>
                    <span style={styles.gaugeValue}>
                      {Math.round(totals.totalCalories)}
                    </span>
                    <span style={styles.gaugeLabel}>
                      / {dailyGoals.calories}
                    </span>
                  </div>
                </div>
                <div style={styles.calorieDetails}>
                  <div style={styles.progressText}>
                    {Math.round(calorieProgress)}% tercapai
                  </div>
                  <div style={styles.calorieSource}>
                    Berdasarkan rekomendasi WHO
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Makronutrien</h3>
                <span style={styles.goalInfo}>Rekomendasi WHO</span>
              </div>
              <div style={styles.macrosContainer}>
                <MacroProgressBar
                  label="Protein"
                  value={totals.totalProtein}
                  goal={dailyGoals.protein}
                  color="#3498db"
                />
                <MacroProgressBar
                  label="Karbohidrat"
                  value={totals.totalCarbs}
                  goal={dailyGoals.carbs}
                  color="#f1c40f"
                />
                <MacroProgressBar
                  label="Lemak"
                  value={totals.totalFat}
                  goal={dailyGoals.fat}
                  color="#e74c3c"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - FOOD LOG */}
        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Makanan Hari Ini</h3>
              <span style={styles.logCount}>{todayLogs.length} item</span>
            </div>
            <FoodLogList
              todayLogs={todayLogs}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>

      {/* HEALTH METRICS PANEL */}
      <div style={styles.healthMetricsSection}>
        <HealthMetricsPanel user={user} onNavigate={onNavigate} />
      </div>
    </div>
  );
};

// ================================
// STYLES (TIDAK BERUBAH)
// ================================
const styles = {
  dashboardContainer: {
    padding: "16px",
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    fontFamily: "'Poppins', sans-serif",
    maxWidth: "100%",
    overflowX: "hidden",
    boxSizing: "border-box",
    width: "100%",
  },

  // HEADER STYLES
  dashboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #e9ecef",
    flexWrap: "wrap",
    gap: "12px",
    width: "100%",
  },
  headerContent: {
    flex: "1 1 300px",
    minWidth: "0",
  },
  headerTitle: {
    color: "#2c3e50",
    fontSize: "clamp(1.5rem, 4vw, 1.75rem)",
    fontWeight: "700",
    margin: "0 0 4px 0",
    lineHeight: "1.2",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  },
  userFirstname: {
    color: "#20c997",
  },
  headerSubtitle: {
    color: "#7f8c8d",
    fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
    margin: "0 0 8px 0",
    fontWeight: "400",
  },
  userInfo: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  userDetail: {
    background: "#e3f2fd",
    color: "#1976d2",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  timeInfo: {
    background: "white",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "clamp(0.8rem, 2vw, 0.85rem)",
    color: "#2c3e50",
    fontWeight: "500",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e9ecef",
    whiteSpace: "nowrap",
    flexShrink: "0",
  },

  // MAIN GRID
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "20px",
    alignItems: "start",
    marginBottom: "20px",
    width: "100%",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px",
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  // CARD STYLES
  card: {
    background: "white",
    padding: "clamp(16px, 3vw, 20px)",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    border: "1px solid #f1f3f4",
    transition: "all 0.3s ease",
    width: "100%",
    boxSizing: "border-box",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "8px",
  },
  cardTitle: {
    color: "#2c3e50",
    fontSize: "clamp(1rem, 3vw, 1.1rem)",
    fontWeight: "600",
    margin: "0",
  },
  goalInfo: {
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    color: "#7f8c8d",
    background: "#f8f9fa",
    padding: "4px 8px",
    borderRadius: "6px",
    whiteSpace: "nowrap",
  },
  logCount: {
    background: "#3498db",
    color: "white",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  // WEEKLY SCORE STYLES
  weeklyScoreSection: {
    width: "100%",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "8px",
  },
  sectionTitle: {
    color: "#2c3e50",
    fontSize: "clamp(1rem, 3vw, 1.1rem)",
    fontWeight: "600",
    margin: "0",
  },
  averageBadge: {
    background: "#3498db",
    color: "white",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  weeklyScoreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
    gap: "8px",
    marginBottom: "16px",
  },
  nutritionScorePie: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "12px 8px",
    borderRadius: "8px",
    background: "#f8f9fa",
    transition: "all 0.3s ease",
  },
  nutritionScorePieToday: {
    background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
    border: "2px solid #2196f3",
  },
  pieHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  dayName: {
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    fontWeight: "600",
    color: "#2c3e50",
  },
  date: {
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    color: "#7f8c8d",
  },
  pieContainer: {
    position: "relative",
  },
  pieCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
  },
  scoreValue: {
    display: "block",
    fontSize: "clamp(0.8rem, 2.5vw, 0.9rem)",
    fontWeight: "700",
    color: "#2c3e50",
    lineHeight: "1",
  },
  scoreMessage: {
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    fontWeight: "600",
    textAlign: "center",
  },

  // CALORIE GAUGE STYLES
  calorieGauge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  gaugeCircle: {
    width: "clamp(100px, 25vw, 120px)",
    height: "clamp(100px, 25vw, 120px)",
    borderRadius: "50%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeCenter: {
    width: "clamp(75px, 20vw, 90px)",
    height: "clamp(75px, 20vw, 90px)",
    background: "white",
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  gaugeValue: {
    fontSize: "clamp(1.2rem, 3.5vw, 1.4rem)",
    fontWeight: "700",
    color: "#20c997",
    lineHeight: "1",
  },
  gaugeLabel: {
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    color: "#7f8c8d",
    marginTop: "2px",
  },
  calorieDetails: {
    textAlign: "center",
  },
  progressText: {
    color: "#7f8c8d",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    fontWeight: "500",
  },
  calorieSource: {
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    color: "#95a5a6",
    fontStyle: "italic",
    marginTop: "4px",
  },

  // MACROS STYLES
  macrosContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  macroItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  macroInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "clamp(0.8rem, 2.2vw, 0.85rem)",
  },
  macroLabel: {
    fontWeight: "500",
    color: "#2c3e50",
  },
  macroValues: {
    fontWeight: "600",
    color: "#2c3e50",
  },
  progressBarBackground: {
    height: "6px",
    background: "#e9ecef",
    borderRadius: "8px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "8px",
    transition: "width 0.5s ease",
  },
  progressPercentage: {
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    color: "#7f8c8d",
    textAlign: "right",
  },

  // FOOD LOG STYLES
  foodLogContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  mealNavigation: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "6px",
    background: "#f8f9fa",
    padding: "6px",
    borderRadius: "10px",
  },
  mealTab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "8px 4px",
    border: "2px solid",
    borderRadius: "8px",
    background: "transparent",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontWeight: "500",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
  },
  mealTabIcon: {
    fontSize: "clamp(0.9rem, 2.5vw, 1rem)",
  },
  mealTabTitle: {
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    fontWeight: "600",
  },
  mealTabCount: {
    fontSize: "clamp(0.6rem, 1.8vw, 0.65rem)",
    opacity: "0.8",
  },
  foodItemsContainer: {
    minHeight: "200px",
    maxHeight: "300px",
    overflowY: "auto",
  },
  foodItemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  foodItemCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "12px",
    background: "#f8f9fa",
    borderRadius: "8px",
    borderLeft: "3px solid #3498db",
    transition: "all 0.3s ease",
    gap: "12px",
    flexWrap: "wrap",
  },
  foodItemMain: {
    flex: "1 1 200px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: "0",
  },
  foodItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
    flexWrap: "wrap",
  },
  foodName: {
    fontSize: "clamp(0.85rem, 2.5vw, 0.9rem)",
    fontWeight: "600",
    color: "#2c3e50",
    margin: "0",
    lineHeight: "1.2",
    wordBreak: "break-word",
  },
  foodCalories: {
    background: "#3498db",
    color: "white",
    padding: "3px 6px",
    borderRadius: "6px",
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    fontWeight: "600",
    whiteSpace: "nowrap",
    flexShrink: "0",
  },
  foodMacros: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  macroBadgeProtein: {
    background: "#3498db",
    color: "white",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  macroBadgeCarb: {
    background: "#f1c40f",
    color: "#2c3e50",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  macroBadgeFat: {
    background: "#e74c3c",
    color: "white",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  foodItemActions: {
    display: "flex",
    gap: "6px",
    flexShrink: "0",
  },
  actionBtnEdit: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    width: "clamp(28px, 8vw, 32px)",
    height: "clamp(28px, 8vw, 32px)",
    background: "#3498db",
    color: "white",
  },
  actionBtnDelete: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    width: "clamp(28px, 8vw, 32px)",
    height: "clamp(28px, 8vw, 32px)",
    background: "#e74c3c",
    color: "white",
  },
  emptyLog: {
    textAlign: "center",
    padding: "30px 20px",
    color: "#7f8c8d",
  },
  emptyIcon: {
    fontSize: "clamp(2rem, 6vw, 2.5rem)",
    marginBottom: "12px",
    opacity: "0.5",
  },
  emptyText: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emptyMessage: {
    margin: "0",
    fontSize: "clamp(0.85rem, 2.5vw, 0.9rem)",
  },
  emptySubtitle: {
    margin: "0",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    opacity: "0.7",
  },
  emptyMeal: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#7f8c8d",
  },
  emptyMealIcon: {
    fontSize: "clamp(2rem, 6vw, 2.5rem)",
    marginBottom: "12px",
    opacity: "0.5",
  },
  emptyMealText: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emptyMealMessage: {
    margin: "0",
    fontSize: "clamp(0.85rem, 2.5vw, 0.9rem)",
  },
  mealSummary: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px",
    background: "#e9ecef",
    borderRadius: "6px",
    marginTop: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  summaryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    flex: "1",
    minWidth: "80px",
  },
  summaryLabel: {
    fontSize: "clamp(0.7rem, 2vw, 0.75rem)",
    color: "#7f8c8d",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: "clamp(0.85rem, 2.5vw, 0.9rem)",
    fontWeight: "600",
    color: "#2c3e50",
  },

  // HEALTH METRICS STYLES
  healthMetricsSection: {
    width: "100%",
  },
  healthMetricsPanel: {
    background: "white",
    padding: "clamp(16px, 3vw, 20px)",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    border: "1px solid #f1f3f4",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "8px",
  },
  panelTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  panelIcon: {
    fontSize: "clamp(1.1rem, 3vw, 1.3rem)",
  },
  panelTitleText: {
    color: "#2c3e50",
    margin: "0",
    fontSize: "clamp(1rem, 3vw, 1.1rem)",
    fontWeight: "600",
  },
  editProfileBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#3498db",
    color: "white",
    border: "none",
    padding: "clamp(6px, 2vw, 8px) clamp(10px, 2.5vw, 12px)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    fontWeight: "500",
    transition: "all 0.3s ease",
    whiteSpace: "nowrap",
  },
  btnIcon: {
    fontSize: "clamp(0.8rem, 2.2vw, 0.9rem)",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  metricCard: {
    background: "#f8f9fa",
    padding: "clamp(12px, 2.5vw, 16px)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.3s ease",
    border: "1px solid #e9ecef",
  },
  metricCardHighlight: {
    background: "linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%)",
    border: "2px solid #3498db",
  },
  metricIcon: {
    fontSize: "clamp(1.3rem, 3.5vw, 1.5rem)",
    flexShrink: "0",
  },
  metricContent: {
    flex: "1",
    minWidth: "0",
  },
  metricLabel: {
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    color: "#7f8c8d",
    marginBottom: "2px",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: "clamp(1rem, 2.8vw, 1.1rem)",
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: "2px",
    wordBreak: "break-word",
  },
  metricCategory: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.75rem)",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "6px",
    background: "rgba(0, 0, 0, 0.05)",
    display: "inline-block",
  },
  metricSource: {
    fontSize: "clamp(0.6rem, 1.6vw, 0.65rem)",
    color: "#95a5a6",
    fontStyle: "italic",
  },
  healthInsights: {
    background: "#e8f5e8",
    padding: "clamp(12px, 2.5vw, 16px)",
    borderRadius: "8px",
    borderLeft: "3px solid #27ae60",
    marginBottom: "16px",
  },
  insightHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    flexWrap: "wrap",
    gap: "8px",
  },
  insightTitle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#27ae60",
    margin: "0",
    fontSize: "clamp(0.9rem, 2.5vw, 0.95rem)",
    fontWeight: "600",
  },
  insightIcon: {
    fontSize: "clamp(0.9rem, 2.5vw, 1rem)",
  },
  bmiStatus: {
    fontWeight: "600",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    whiteSpace: "nowrap",
  },
  insightAdvice: {
    margin: "0",
    color: "#2c3e50",
    lineHeight: "1.4",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
  },
  whoReference: {
    fontSize: "clamp(0.65rem, 1.8vw, 0.7rem)",
    color: "#27ae60",
    fontStyle: "italic",
    marginTop: "8px",
  },
  incompleteDataWarning: {
    background: "#fff3cd",
    border: "1px solid #ffeaa7",
    borderRadius: "8px",
    padding: "clamp(12px, 2.5vw, 16px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  warningContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: "1",
    minWidth: "200px",
  },
  warningIcon: {
    fontSize: "clamp(1.3rem, 3.5vw, 1.5rem)",
  },
  warningText: {
    flex: "1",
    minWidth: "0",
  },
  warningTitle: {
    margin: "0 0 2px 0",
    color: "#856404",
    fontSize: "clamp(0.85rem, 2.5vw, 0.9rem)",
    fontWeight: "600",
  },
  warningDescription: {
    margin: "0",
    color: "#856404",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
  },
  completeProfileBtn: {
    background: "#f39c12",
    color: "white",
    border: "none",
    padding: "clamp(6px, 2vw, 8px) clamp(10px, 2.5vw, 12px)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "clamp(0.75rem, 2vw, 0.8rem)",
    fontWeight: "600",
    whiteSpace: "nowrap",
    transition: "all 0.3s ease",
  },
};

// Media Queries untuk responsive design
const DashboardWithMediaQueries = (props) => {
  React.useEffect(() => {
    // Tambahkan style untuk media queries
    const style = document.createElement("style");
    style.textContent = `
      @media (min-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr 1fr !important;
        }
        .stats-grid {
          grid-template-columns: 1fr 1fr !important;
        }
        .meal-navigation {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .metrics-grid {
          grid-template-columns: repeat(3, 1fr) !important;
        }
      }

      @media (min-width: 1024px) {
        .dashboard-grid {
          grid-template-columns: 2fr 1fr !important;
        }
        .metrics-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .weekly-score-grid {
          grid-template-columns: repeat(7, 1fr) !important;
        }
      }

      @media (max-width: 480px) {
        .weekly-score-grid {
          grid-template-columns: repeat(4, 1fr) !important;
        }
        .user-info {
          flex-direction: column;
          align-items: flex-start;
        }
        .food-item-card {
          flex-direction: column;
        }
        .food-item-actions {
          align-self: flex-end;
        }
      }

      @media (max-width: 360px) {
        .weekly-score-grid {
          grid-template-columns: repeat(3, 1fr) !important;
        }
        .meal-navigation {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <Dashboard {...props} />;
};

export default DashboardWithMediaQueries;

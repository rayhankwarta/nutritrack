import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

// ================================
// FUNGSI UTILITAS YANG SAMA DENGAN DASHBOARD & ANALYTICS
// ================================

// Fungsi menghitung kebutuhan kalori berdasarkan WHO & Harris-Benedict (SAMA dengan dashboard)
const calculateCalorieGoal = (user) => {
  if (!user?.gender || !user?.weight || !user?.height || !user?.ageCategory)
    return 2000;

  const { gender, weight, height, ageCategory } = user;

  // Konversi kategori usia ke usia rata-rata (SAMA dengan dashboard)
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

  const age = ageMap[ageCategory] || 30;

  // Rumus Harris-Benedict (SAMA dengan dashboard)
  let bmr = 0;
  if (gender === "Male") {
    bmr = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  } else {
    bmr = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  }

  // Faktor aktivitas (SAMA dengan dashboard)
  const activityFactor = 1.2;
  let tdee = bmr * activityFactor;

  // Adjust berdasarkan kategori usia (SAMA dengan dashboard)
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
      return Math.round(tdee);
    case "dewasa":
      return Math.round(tdee * 0.95);
    case "pra_lansia":
      return Math.round(tdee * 0.85);
    case "lansia":
      return Math.round(tdee * 0.75);
    default:
      return Math.round(tdee);
  }
};

// Fungsi menghitung target makronutrien berdasarkan WHO (SAMA dengan dashboard)
const calculateMacroGoals = (user, calorieGoal) => {
  if (!user) {
    return {
      protein: 50,
      carbs: 275,
      fat: 65,
    };
  }

  const { ageCategory } = user;

  // Rekomendasi WHO untuk distribusi makronutrien (SAMA dengan dashboard)
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

// Fungsi helper untuk menghitung skor makronutrien individu (SAMA dengan dashboard)
const calculateMacroScore = (actual, target) => {
  if (target === 0) return 100;
  
  const ratio = actual / target;
  
  // Range yang sama dengan dashboard.js
  if (ratio >= 0.9 && ratio <= 1.1) {
    return 100; // Range ideal 90-110%
  } else if (ratio >= 0.8 && ratio <= 1.2) {
    return 90; // Range very good 80-120%
  } else if (ratio >= 0.7 && ratio <= 1.3) {
    return 70; // Range acceptable 70-130%
  } else if (ratio < 0.7) {
    return Math.max(0, (ratio / 0.7) * 70);
  } else {
    return Math.max(0, 100 - ((ratio - 1.3) / 0.7) * 30);
  }
};

// Fungsi untuk bonus/penalty keseimbangan makronutrien (SAMA dengan dashboard)
const calculateMacroBalanceBonus = (dayTotals, macroGoals) => {
  const totalMacroCalories = (dayTotals.protein * 4) + (dayTotals.carbs * 4) + (dayTotals.fat * 9);
  if (totalMacroCalories === 0) return 0;

  const proteinRatio = (dayTotals.protein * 4) / totalMacroCalories;
  const carbRatio = (dayTotals.carbs * 4) / totalMacroCalories;
  const fatRatio = (dayTotals.fat * 9) / totalMacroCalories;

  // Target rasio berdasarkan WHO (SAMA dengan dashboard)
  const targetProteinRatio = 0.2; // 20%
  const targetCarbRatio = 0.55;   // 55%
  const targetFatRatio = 0.25;    // 25%

  const proteinDeviation = Math.abs(proteinRatio - targetProteinRatio);
  const carbDeviation = Math.abs(carbRatio - targetCarbRatio);
  const fatDeviation = Math.abs(fatRatio - targetFatRatio);

  const totalDeviation = proteinDeviation + carbDeviation + fatDeviation;
  
  // Bonus maksimal 10 poin, penalty maksimal -10 poin (SAMA dengan dashboard)
  if (totalDeviation < 0.1) return 10; // Sangat seimbang
  if (totalDeviation < 0.2) return 5;  // Cukup seimbang
  if (totalDeviation > 0.4) return -10; // Tidak seimbang
  if (totalDeviation > 0.3) return -5;  // Agak tidak seimbang
  
  return 0; // Netral
};

// Fungsi utama untuk menghitung skor nutrisi (SAMA LOGIKA dengan dashboard.js)
const calculateDailyNutritionScore = (dayTotals, calorieGoal, macroGoals) => {
  if (!dayTotals || dayTotals.calories === 0) return 0;

  let totalScore = 0;

  // 1. Skor Kalori (40% bobot) - SAMA dengan dashboard.js
  const calorieDeviation = Math.abs(dayTotals.calories - calorieGoal);
  const calorieTolerance = calorieGoal * 0.15; // Toleransi 15%
  
  let calorieScore = 0;
  if (calorieDeviation <= calorieTolerance) {
    calorieScore = 100; // Dalam toleransi
  } else {
    // Semakin jauh dari target, semakin rendah skor
    const excessRatio = Math.min(calorieDeviation / calorieGoal, 1.0);
    calorieScore = Math.max(0, 100 - (excessRatio * 60)); // Penalty lebih besar
  }
  totalScore += calorieScore * 0.4;

  // 2. Skor Makronutrien (60% bobot total - 20% masing-masing) - SAMA dengan dashboard.js
  const macroScores = {
    protein: calculateMacroScore(dayTotals.protein, macroGoals.protein),
    carbs: calculateMacroScore(dayTotals.carbs, macroGoals.carbs),
    fat: calculateMacroScore(dayTotals.fat, macroGoals.fat)
  };

  totalScore += macroScores.protein * 0.2;
  totalScore += macroScores.carbs * 0.2;
  totalScore += macroScores.fat * 0.2;

  // 3. Bonus/Penalty berdasarkan keseimbangan makronutrien - SAMA dengan dashboard.js
  const balanceBonus = calculateMacroBalanceBonus(dayTotals, macroGoals);
  totalScore += balanceBonus;

  // Pastikan skor antara 0-100
  return Math.max(0, Math.min(100, Math.round(totalScore)));
};

// ================================
// KOMPONEN UTAMA NUTRITION ASSISTANT
// ================================

const NutritionAssistant = ({ foodLogs, user }) => {
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Hitung goals dengan fungsi yang SAMA dengan dashboard & analytics
  const userCalorieGoal = calculateCalorieGoal(user);
  const userMacroGoals = calculateMacroGoals(user, userCalorieGoal);

  const dailyGoals = {
    calories: userCalorieGoal,
    protein: userMacroGoals.protein,
    carbohydrates: userMacroGoals.carbs,
    fat: userMacroGoals.fat,
  };

  // Process data dengan format yang KONSISTEN dengan dashboard.js
  const getTodayFoodLogs = () => {
    const today = new Date();
    const wibOffset = 7 * 60;
    const localOffset = today.getTimezoneOffset();
    const todayWIB = new Date(today.getTime() + (wibOffset + localOffset) * 60000);
    const todayString = todayWIB.toLocaleDateString("en-CA");

    return foodLogs.filter((log) => {
      const logDate = new Date(log.date);
      const logDateWIB = new Date(
        logDate.getTime() + (7 * 60 + logDate.getTimezoneOffset()) * 60000
      );
      return logDateWIB.toLocaleDateString("en-CA") === todayString;
    });
  };

  // Hitung totals hari ini dengan format yang SAMA
  const getTodayTotals = () => {
    const todayLogs = getTodayFoodLogs();
    
    return todayLogs.reduce(
      (acc, log) => {
        acc.totalCalories += log.calories;
        acc.totalProtein += log.protein;
        acc.totalCarbs += log.carbohydrates;
        acc.totalFat += log.fat;
        return acc;
      },
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
    );
  };

  // Hitung nutrition score hari ini dengan fungsi yang SAMA
  const getTodayNutritionScore = () => {
    const todayTotals = getTodayTotals();
    const dayTotals = {
      calories: todayTotals.totalCalories,
      protein: todayTotals.totalProtein,
      carbs: todayTotals.totalCarbs,
      fat: todayTotals.totalFat
    };
    
    return calculateDailyNutritionScore(dayTotals, dailyGoals.calories, dailyGoals);
  };

  // Analisis pola makan untuk insight tambahan
  const getMealPatternInsights = () => {
    const todayLogs = getTodayFoodLogs();
    
    if (todayLogs.length === 0) {
      return {
        totalMeals: 0,
        mealIntervals: [],
        calorieDistribution: {},
        insights: ["Belum ada makanan yang dicatat hari ini"]
      };
    }

    // Analisis waktu makan
    const mealTimes = todayLogs.map((log) => {
      const logTime = new Date(log.date);
      return {
        time: logTime.getHours() * 60 + logTime.getMinutes(),
        calories: log.calories,
        mealType: log.mealType
      };
    });

    mealTimes.sort((a, b) => a.time - b.time);

    // Hitung interval antara waktu makan
    const mealIntervals = [];
    for (let i = 1; i < mealTimes.length; i++) {
      const gap = mealTimes[i].time - mealTimes[i - 1].time;
      mealIntervals.push(gap);
    }

    // Distribusi kalori per waktu makan
    const calorieDistribution = todayLogs.reduce((acc, log) => {
      acc[log.mealType] = (acc[log.mealType] || 0) + log.calories;
      return acc;
    }, {});

    // Generate insights
    const insights = [];
    
    // Insight jumlah makanan
    if (todayLogs.length < 3) {
      insights.push("Jumlah waktu makan hari ini kurang dari 3 kali");
    } else if (todayLogs.length >= 5) {
      insights.push("Frekuensi makan cukup baik dengan 5 kali atau lebih");
    }

    // Insight interval makan
    const longGaps = mealIntervals.filter(gap => gap > 240);
    if (longGaps.length > 0) {
      insights.push("Terdapat interval lebih dari 4 jam antara waktu makan");
    }

    // Insight distribusi kalori
    const totalCalories = getTodayTotals().totalCalories;
    if (totalCalories > 0) {
      const breakfastRatio = (calorieDistribution.Breakfast || 0) / totalCalories;
      if (breakfastRatio < 0.2) {
        insights.push("Asupan sarapan relatif rendah");
      }
    }

    return {
      totalMeals: todayLogs.length,
      mealIntervals,
      calorieDistribution,
      insights: insights.length > 0 ? insights : ["Pola makan hari ini cukup baik"]
    };
  };

  const handleGetAnalysis = async () => {
    setIsLoading(true);
    setAnalysis("");
    setShowAnalysis(false);

    const todayFoodLogs = getTodayFoodLogs();
    const todayTotals = getTodayTotals();
    const nutritionScore = getTodayNutritionScore();
    const mealPattern = getMealPatternInsights();

    try {
      const response = await axios.post("/api/assistant/analysis", {
        user: {
          ...user,
          calorieGoal: dailyGoals.calories,
          macroGoals: dailyGoals
        },
        foodLogs: todayFoodLogs,
        dailyGoals,
        todayTotals: {
          calories: todayTotals.totalCalories,
          protein: todayTotals.totalProtein,
          carbs: todayTotals.totalCarbs,
          fat: todayTotals.totalFat
        },
        nutritionScore,
        mealPattern,
        analysisContext: {
          calorieDeviation: Math.abs(todayTotals.totalCalories - dailyGoals.calories),
          proteinRatio: todayTotals.totalProtein / dailyGoals.protein,
          carbRatio: todayTotals.totalCarbs / dailyGoals.carbohydrates,
          fatRatio: todayTotals.totalFat / dailyGoals.fat,
          macroBalance: calculateMacroBalanceBonus(
            {
              protein: todayTotals.totalProtein,
              carbs: todayTotals.totalCarbs,
              fat: todayTotals.totalFat
            },
            dailyGoals
          )
        }
      });
      setAnalysis(response.data.analysisText);
      setTimeout(() => {
        setShowAnalysis(true);
      }, 300);
    } catch (error) {
      console.error("Gagal mendapatkan analisis:", error);
      
      // Fallback analysis berdasarkan data lokal
      const fallbackAnalysis = generateFallbackAnalysis(
        todayTotals, 
        dailyGoals, 
        nutritionScore, 
        mealPattern
      );
      setAnalysis(fallbackAnalysis);
      setTimeout(() => {
        setShowAnalysis(true);
      }, 300);
      
      console.log("Menggunakan analisis fallback karena API error");
    }
    setIsLoading(false);
  };

  // Fallback analysis jika API error
  const generateFallbackAnalysis = (todayTotals, goals, score, mealPattern) => {
    const calorieDiff = todayTotals.totalCalories - goals.calories;
    const proteinDiff = todayTotals.totalProtein - goals.protein;
    const carbDiff = todayTotals.totalCarbs - goals.carbohydrates;
    const fatDiff = todayTotals.totalFat - goals.fat;

    let analysis = `# Analisis Nutrisi Harian Anda\n\n`;
    
    // Skor keseluruhan
    analysis += `## 📊 Skor Nutrisi: ${score}/100\n\n`;
    analysis += `${getScoreMessage(score)}\n\n`;

    // Analisis kalori
    analysis += `## 🔥 Analisis Kalori\n`;
    analysis += `- **Target**: ${goals.calories} kkal\n`;
    analysis += `- **Konsumsi**: ${Math.round(todayTotals.totalCalories)} kkal\n`;
    analysis += `- **Selisih**: ${calorieDiff > 0 ? '+' : ''}${Math.round(calorieDiff)} kkal\n\n`;
    analysis += `${getCalorieAdvice(calorieDiff, goals.calories)}\n\n`;

    // Analisis makronutrien
    analysis += `## 🥗 Analisis Makronutrien\n`;
    analysis += `### Protein: ${Math.round(todayTotals.totalProtein)}g / ${goals.protein}g (${Math.round((todayTotals.totalProtein/goals.protein)*100)}%)\n`;
    analysis += `${getMacroAdvice('protein', proteinDiff, goals.protein)}\n\n`;

    analysis += `### Karbohidrat: ${Math.round(todayTotals.totalCarbs)}g / ${goals.carbohydrates}g (${Math.round((todayTotals.totalCarbs/goals.carbohydrates)*100)}%)\n`;
    analysis += `${getMacroAdvice('carbs', carbDiff, goals.carbohydrates)}\n\n`;

    analysis += `### Lemak: ${Math.round(todayTotals.totalFat)}g / ${goals.fat}g (${Math.round((todayTotals.totalFat/goals.fat)*100)}%)\n`;
    analysis += `${getMacroAdvice('fat', fatDiff, goals.fat)}\n\n`;

    // Insight pola makan
    if (mealPattern.insights.length > 0) {
      analysis += `## 💡 Insight Pola Makan\n`;
      mealPattern.insights.forEach(insight => {
        analysis += `- ${insight}\n`;
      });
      analysis += `\n`;
    }

    // Rekomendasi umum
    analysis += `## 🎯 Rekomendasi Utama\n`;
    analysis += `${getGeneralRecommendations(score, calorieDiff, mealPattern)}\n\n`;

    analysis += `---\n*Analisis ini dibuat berdasarkan data nutrisi Anda hari ini.*`;

    return analysis;
  };

  // Helper functions untuk fallback analysis
  const getScoreMessage = (score) => {
    if (score >= 90) return "🏆 **Excellent!** Pola makan Anda hampir sempurna sesuai rekomendasi WHO.";
    if (score >= 80) return "✅ **Sangat Baik!** Pola makan Anda sangat sehat dan seimbang.";
    if (score >= 70) return "👍 **Baik!** Pola makan Anda cukup baik, ada sedikit ruang untuk improvement.";
    if (score >= 60) return "📊 **Cukup!** Pola makan Anda acceptable, tetapi perlu perbaikan di beberapa area.";
    return "💡 **Perlu Perhatian!** Pola makan Anda membutuhkan penyesuaian untuk mencapai target kesehatan optimal.";
  };

  const getCalorieAdvice = (diff, goal) => {
    const percentage = Math.abs(diff) / goal;
    if (percentage <= 0.1) return "✅ **Ideal!** Asupan kalori Anda sangat mendekati target.";
    if (percentage <= 0.2) return "👍 **Baik!** Asupan kalori dalam batas wajar.";
    if (diff > 0) return `📈 **Kelebihan!** Pertimbangkan mengurangi ${Math.round(diff)} kkal untuk mencapai target.`;
    return `📉 **Kekurangan!** Tambahkan ${Math.abs(Math.round(diff))} kkal untuk memenuhi kebutuhan harian.`;
  };

  const getMacroAdvice = (macroType, diff, goal) => {
    const percentage = Math.abs(diff) / goal;
    const macroNames = {
      protein: "protein",
      carbs: "karbohidrat",
      fat: "lemak"
    };

    if (percentage <= 0.1) return `✅ Asupan ${macroNames[macroType]} ideal.`;
    if (percentage <= 0.2) return `👍 Asupan ${macroNames[macroType]} dalam batas wajar.`;
    
    if (diff > 0) {
      return `📈 **Kelebihan ${macroNames[macroType]}!** Pertimbangkan mengurangi asupan ${macroNames[macroType]}.`;
    } else {
      return `📉 **Kekurangan ${macroNames[macroType]}!** Tingkatkan konsumsi ${macroNames[macroType]}.`;
    }
  };

  const getGeneralRecommendations = (score, calorieDiff, mealPattern) => {
    const recommendations = [];
    
    if (score < 70) {
      recommendations.push("**Fokus pada keseimbangan makronutrien** - pastikan protein, karbo, dan lemak dalam proporsi yang tepat");
    }
    
    if (Math.abs(calorieDiff) > dailyGoals.calories * 0.2) {
      if (calorieDiff > 0) {
        recommendations.push("**Kurangi porsi makan** atau pilih makanan rendah kalori namun tinggi nutrisi");
      } else {
        recommendations.push("**Tambah asupan kalori** dengan makanan padat nutrisi seperti kacang-kacangan dan whole grains");
      }
    }

    if (mealPattern.totalMeals < 3) {
      recommendations.push("**Tingkatkan frekuensi makan** menjadi 3-5 kali sehari dengan porsi terkontrol");
    }

    if (mealPattern.insights.some(insight => insight.includes('interval'))) {
      recommendations.push("**Atur jadwal makan yang konsisten** dengan interval 3-4 jam untuk metabolisme optimal");
    }

    if (recommendations.length === 0) {
      return "**Pertahankan pola makan sehat Anda!** Konsistensi adalah kunci untuk hasil yang optimal.";
    }

    return recommendations.map(rec => `- ${rec}`).join('\n');
  };

  return (
    <div className="nutrition-assistant">
      <div className="assistant-container">
        <div className="assistant-card">
          {/* Header */}
          <div className="card-header">
            <div className="header-content">
              <div className="header-icon">
                <span className="ai-icon"></span>
              </div>
              <div className="header-text">
                <h1 className="card-title">Asisten Nutrisi AI</h1>
                <p className="card-subtitle">
                  Dapatkan analisis instan dan rekomendasi cerdas dari AI untuk
                  asupan nutrisi Anda hari ini berdasarkan data dashboard.
                </p>
                {user && (
                  <div className="user-goals-info">
                    <div className="goal-badge">
                      <span className="goal-icon">🎯</span>
                      Target: {dailyGoals.calories} kkal
                    </div>
                    <div className="goal-badge">
                      <span className="goal-icon">🥩</span>
                      Protein: {dailyGoals.protein}g
                    </div>
                    <div className="goal-badge">
                      <span className="goal-icon">🌾</span>
                      Karbo: {dailyGoals.carbohydrates}g
                    </div>
                    <div className="goal-badge">
                      <span className="goal-icon">🥑</span>
                      Lemak: {dailyGoals.fat}g
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="action-area">
            <button
              onClick={handleGetAnalysis}
              disabled={isLoading}
              className={`action-button ${isLoading ? "is-loading" : ""}`}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span className="button-text">AI Sedang Menganalisis...</span>
                </>
              ) : (
                <>
                  <span className="button-icon">✨</span>
                  <span className="button-text">Dapatkan Analisis Saya</span>
                </>
              )}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="loading-section">
              <div className="loading-content">
                <div className="loading-visual">
                  <div className="pulse-orb">
                    <div className="orb-core">
                      <span className="orb-emoji">🥗</span>
                    </div>
                    <div className="orb-ring"></div>
                    <div className="orb-ring ring-delay"></div>
                  </div>
                </div>
                <div className="loading-info">
                  <p className="loading-message">
                    Menganalisis pola makan Anda
                  </p>
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="loading-stats">
                    <div className="stat-item">
                      <span className="stat-label">Kalori</span>
                      <span className="stat-value">{getTodayTotals().totalCalories.toFixed(0)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Protein</span>
                      <span className="stat-value">{getTodayTotals().totalProtein.toFixed(0)}g</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Skor</span>
                      <span className="stat-value">{getTodayNutritionScore()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && (
            <div className={`result-section ${showAnalysis ? "fade-in" : ""}`}>
              <div className="result-header">
                <h2 className="result-title">Analisis Nutrisi Anda</h2>
                <div className="result-divider"></div>
              </div>
              <div className="result-body">
                <div className="analysis-card">
                  <div className="analysis-content">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h3 className="md-h1">{children}</h3>
                        ),
                        h2: ({ children }) => (
                          <h3 className="md-h2">{children}</h3>
                        ),
                        h3: ({ children }) => (
                          <h4 className="md-h3">{children}</h4>
                        ),
                        p: ({ children }) => <p className="md-p">{children}</p>,
                        ul: ({ children }) => (
                          <ul className="md-ul">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="md-ol">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="md-li">{children}</li>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="md-blockquote">
                            {children}
                          </blockquote>
                        ),
                        strong: ({ children }) => (
                          <strong className="md-strong">{children}</strong>
                        ),
                      }}
                    >
                      {analysis}
                    </ReactMarkdown>
                  </div>
                  <div className="analysis-footer">
                    <div className="ai-badge">
                      <span className="ai-badge-icon">🤖</span>
                      <span className="ai-badge-text">
                        Dianalisis oleh AI Nutrisi - Berdasarkan Data Dashboard
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .nutrition-assistant {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2.5rem 1.5rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4edf9 100%);
          font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .assistant-container {
          width: 100%;
          max-width: 850px;
        }

        .assistant-card {
          background: white;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .assistant-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.12);
        }

        /* Header */
        .card-header {
          padding: 2.5rem 2.5rem 1.8rem;
          background: linear-gradient(to right, #f9fafb, #f3f4f6);
          border-bottom: 1px solid #e5e7eb;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-icon {
          flex-shrink: 0;
        }

        .ai-icon {
          font-size: 2.8rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .header-text {
          flex: 1;
        }

        .card-title {
          font-size: 2.1rem;
          font-weight: 800;
          margin: 0 0 0.6rem 0;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .card-subtitle {
          font-size: 1.15rem;
          color: #6b7280;
          margin: 0 0 1rem 0;
          line-height: 1.5;
          font-weight: 400;
        }

        .user-goals-info {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          margin-top: 1rem;
        }

        .goal-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: white;
          padding: 0.5rem 0.9rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #4b5563;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .goal-icon {
          font-size: 0.9rem;
        }

        /* Action Area */
        .action-area {
          padding: 2rem 2.5rem 1.5rem;
          display: flex;
          justify-content: center;
        }

        .action-button {
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 1.1rem 2.2rem;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          min-width: 280px;
          position: relative;
          overflow: hidden;
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(124, 58, 237, 0.45);
        }

        .action-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .action-button:disabled {
          opacity: 0.85;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 1.25rem;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Loading Section */
        .loading-section {
          padding: 2.5rem;
          text-align: center;
        }

        .loading-content {
          max-width: 500px;
          margin: 0 auto;
        }

        .loading-visual {
          margin-bottom: 1.8rem;
        }

        .pulse-orb {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto;
        }

        .orb-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .orb-emoji {
          font-size: 1.6rem;
          animation: rotate 8s linear infinite;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .orb-ring {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 2px solid #e5e7eb;
          border-radius: 50%;
          animation: ringExpand 2s ease-out infinite;
        }

        .ring-delay {
          animation-delay: 1s;
        }

        @keyframes ringExpand {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        .loading-info {
          margin-top: 1.2rem;
        }

        .loading-message {
          font-size: 1.1rem;
          color: #4b5563;
          margin: 0 0 1rem;
          font-weight: 500;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 0.3rem;
          margin-bottom: 1.5rem;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: #7c3aed;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%,
          100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .loading-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.85rem;
          color: #6b7280;
          margin-bottom: 0.3rem;
        }

        .stat-value {
          display: block;
          font-size: 1.2rem;
          font-weight: 700;
          color: #4f46e5;
        }

        /* Result Section */
        .result-section {
          padding: 0 2.5rem 2.5rem;
          opacity: 0;
          transform: translateY(15px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }

        .result-section.fade-in {
          opacity: 1;
          transform: translateY(0);
        }

        .result-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .result-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 1rem;
        }

        .result-divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(to right, #4f46e5, #7c3aed);
          margin: 0 auto;
          border-radius: 2px;
        }

        .result-body {
          display: flex;
          justify-content: center;
        }

        .analysis-card {
          width: 100%;
          background: #f9fafb;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .analysis-content {
          padding: 2.2rem;
          color: #374151;
          line-height: 1.7;
        }

        /* Markdown Styling */
        .md-h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 1.8rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .md-h2 {
          font-size: 1.35rem;
          font-weight: 600;
          color: #1f2937;
          margin: 1.6rem 0 1rem;
        }

        .md-h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #1f2937;
          margin: 1.4rem 0 0.9rem;
        }

        .md-p {
          margin: 0 0 1.1rem 0;
          font-size: 1.02rem;
        }

        .md-ul,
        .md-ol {
          margin: 1rem 0 1.2rem;
          padding-left: 1.8rem;
        }

        .md-li {
          margin-bottom: 0.6rem;
          line-height: 1.6;
        }

        .md-blockquote {
          border-left: 3px solid #7c3aed;
          background: #f5f3ff;
          padding: 1rem 1.4rem;
          margin: 1.4rem 0;
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: #5b21b6;
        }

        .md-strong {
          color: #4f46e5;
          font-weight: 600;
        }

        .analysis-footer {
          padding: 1.4rem 2.2rem;
          background: #f3f4f6;
          border-top: 1px solid #e5e7eb;
        }

        .ai-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          color: #6b7280;
          font-size: 0.95rem;
        }

        .ai-badge-icon {
          font-size: 1.1rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .nutrition-assistant {
            padding: 1.5rem 1rem;
          }

          .card-header {
            padding: 2rem 1.5rem 1.5rem;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .card-title {
            font-size: 1.8rem;
          }

          .card-subtitle {
            font-size: 1.05rem;
          }

          .user-goals-info {
            justify-content: center;
          }

          .goal-badge {
            font-size: 0.8rem;
            padding: 0.4rem 0.7rem;
          }

          .action-area {
            padding: 1.8rem 1.5rem 1.2rem;
          }

          .action-button {
            width: 100%;
            max-width: 320px;
            padding: 1rem 1.8rem;
            font-size: 1.05rem;
          }

          .loading-section {
            padding: 2rem 1.5rem;
          }

          .loading-stats {
            gap: 1.5rem;
          }

          .result-section {
            padding: 0 1.5rem 2rem;
          }

          .analysis-content {
            padding: 1.8rem 1.5rem;
          }

          .analysis-footer {
            padding: 1.2rem 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .nutrition-assistant {
            padding: 1rem 0.8rem;
          }

          .card-header {
            padding: 1.6rem 1.2rem 1.2rem;
          }

          .card-title {
            font-size: 1.6rem;
          }

          .card-subtitle {
            font-size: 1rem;
          }

          .user-goals-info {
            gap: 0.5rem;
          }

          .goal-badge {
            font-size: 0.75rem;
            padding: 0.3rem 0.6rem;
          }

          .action-button {
            padding: 0.9rem 1.5rem;
            font-size: 1rem;
          }

          .result-title {
            font-size: 1.5rem;
          }

          .analysis-content {
            padding: 1.5rem 1.2rem;
          }

          .loading-stats {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default NutritionAssistant;
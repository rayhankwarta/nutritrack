import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const FoodTracker = ({
  onFoodAdded,
  onNavigate,
  editingLog,
  onFoodUpdated,
  onCancelEdit,
}) => {
  const [formData, setFormData] = useState({
    foodName: "",
    calories: "",
    protein: "",
    carbohydrates: "",
    fat: "",
    mealType: "Breakfast",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(editingLog);

  // Fungsi untuk membersihkan dan mengkonversi angka
  const cleanNumberInput = (value) => {
    if (value === "" || value === null || value === undefined) return "";

    let cleaned = value.toString().replace(",", ".");
    cleaned = cleaned.replace(/[^\d.]/g, "");

    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    return cleaned;
  };

  // Fungsi untuk mengkonversi string ke number dengan aman
  const safeParseNumber = (value) => {
    if (value === "" || value === null || value === undefined) return 0;

    const cleaned = cleanNumberInput(value);
    if (cleaned === "") return 0;

    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentFoodSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Update form when editing
  useEffect(() => {
    if (isEditMode) {
      setFormData({
        foodName: editingLog.foodName,
        calories: editingLog.calories?.toString() || "",
        protein: editingLog.protein?.toString() || "",
        carbohydrates: editingLog.carbohydrates?.toString() || "",
        fat: editingLog.fat?.toString() || "",
        mealType: editingLog.mealType,
      });
    } else {
      setFormData({
        foodName: "",
        calories: "",
        protein: "",
        carbohydrates: "",
        fat: "",
        mealType: "Breakfast",
      });
    }
  }, [editingLog, isEditMode]);

  // Auto-suggest functionality berdasarkan recent searches
  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = recentSearches
        .filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, recentSearches]);

  // Save recent search
  const saveRecentSearch = useCallback(
    (food) => {
      const newRecent = [
        food,
        ...recentSearches.filter((item) => item.name !== food.name),
      ].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("recentFoodSearches", JSON.stringify(newRecent));
    },
    [recentSearches]
  );

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Translation functions
  const translateFoodText = async (text) => {
    try {
      if (!text || text.trim() === "") return text;

      const cacheKey = `translation_${text}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=en|id`
      );
      const data = await response.json();

      if (data.responseStatus === 200 && data.responseData.translatedText) {
        const translatedText = data.responseData.translatedText;
        localStorage.setItem(cacheKey, translatedText);
        return translatedText;
      }

      return text;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  };

  const processSearchResults = async (results) => {
    const processedResults = [];

    for (const food of results) {
      try {
        const translatedName = await translateFoodText(food.food_name);

        let translatedDescription = food.food_description;
        let translatedType = food.food_type;

        if (food.food_type) {
          translatedType = await translateFoodText(food.food_type);
        }

        if (food.food_description) {
          let desc = food.food_description;
          desc = desc.replace(/Calories:/g, "Kalori:");
          desc = desc.replace(/Fat:/g, "Lemak:");
          desc = desc.replace(/Carbs:/g, "Karbohidrat:");
          desc = desc.replace(/Protein:/g, "Protein:");
          desc = desc.replace(/Serving Size:/g, "Ukuran Sajian:");
          desc = desc.replace(/per serving/g, "per sajian");
          desc = desc.replace(/per 100g/g, "per 100g");

          const parts = desc.split(" - ");
          if (parts.length > 1) {
            const nonNutritionParts = parts.slice(1).join(" - ");
            const translatedNonNutrition = await translateFoodText(
              nonNutritionParts
            );
            translatedDescription = `${parts[0]} - ${translatedNonNutrition}`;
          } else {
            translatedDescription = desc;
          }
        }

        processedResults.push({
          ...food,
          food_name: translatedName,
          food_description: translatedDescription,
          food_type: translatedType,
        });
      } catch (error) {
        console.error("Error processing food item:", error);
        processedResults.push(food);
      }
    }

    return processedResults;
  };

  // Search handler
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError("Masukkan nama makanan untuk mencari");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `/api/fatsecret/search?query=${searchQuery}`
      );
      const results = response.data || [];

      if (results.length === 0) {
        setError("Tidak ada hasil ditemukan. Coba kata kunci lain.");
        setSearchResults([]);
      } else {
        const translatedResults = await processSearchResults(results);
        setSearchResults(translatedResults);
        saveRecentSearch({ name: searchQuery });
      }
    } catch (error) {
      console.error("Error searching food:", error);
      setError(
        "Gagal mencari makanan. Periksa koneksi internet dan coba lagi."
      );
      setSearchResults([]);
    }
    setIsLoading(false);
  };

  // Select food from search results
  const handleSelectFood = (food) => {
    const nutritionDesc = food.food_description;
    const caloriesMatch = nutritionDesc.match(
      /(?:Kalori|Calories):\s*(\d+\.?\d*)/
    );
    const fatMatch = nutritionDesc.match(/(?:Lemak|Fat):\s*(\d+\.?\d*)/);
    const carbsMatch = nutritionDesc.match(
      /(?:Karbohidrat|Carbs):\s*(\d+\.?\d*)/
    );
    const proteinMatch = nutritionDesc.match(/(?:Protein):\s*(\d+\.?\d*)/);

    setFormData({
      ...formData,
      foodName: food.food_name,
      calories: caloriesMatch ? parseFloat(caloriesMatch[1]).toString() : "0",
      fat: fatMatch ? parseFloat(fatMatch[1]).toString() : "0",
      carbohydrates: carbsMatch ? parseFloat(carbsMatch[1]).toString() : "0",
      protein: proteinMatch ? parseFloat(proteinMatch[1]).toString() : "0",
    });
    setSearchResults([]);
    setSearchQuery("");
    setShowSuggestions(false);
    setSuccess("Data makanan berhasil dimuat ke form!");
  };

  // Form change handler dengan cleaning number input
  const handleChangeInternal = (e) => {
    const { name, value } = e.target;

    if (["calories", "protein", "carbohydrates", "fat"].includes(name)) {
      const cleanedValue = cleanNumberInput(value);
      setFormData((prevState) => ({ ...prevState, [name]: cleanedValue }));
    } else {
      setFormData((prevState) => ({ ...prevState, [name]: value }));
    }
  };

  // Form submission dengan parsing yang aman
  const handleSubmitInternal = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (!formData.foodName.trim()) {
        throw new Error("Nama makanan harus diisi");
      }

      const foodDataWithNumbers = {
        foodName: formData.foodName.trim(),
        mealType: formData.mealType,
        calories: safeParseNumber(formData.calories),
        protein: safeParseNumber(formData.protein),
        carbohydrates: safeParseNumber(formData.carbohydrates),
        fat: safeParseNumber(formData.fat),
      };

      if (
        foodDataWithNumbers.calories < 0 ||
        foodDataWithNumbers.protein < 0 ||
        foodDataWithNumbers.carbohydrates < 0 ||
        foodDataWithNumbers.fat < 0
      ) {
        throw new Error("Nilai nutrisi tidak boleh negatif");
      }

      if (foodDataWithNumbers.calories > 10000) {
        throw new Error("Nilai kalori terlalu tinggi");
      }

      if (isEditMode) {
        await onFoodUpdated(editingLog._id, foodDataWithNumbers);
        setSuccess("Catatan makanan berhasil diperbarui!");
      } else {
        await onFoodAdded(foodDataWithNumbers);
        setSuccess("Makanan berhasil ditambahkan!");
        setTimeout(() => {
          onNavigate("dashboard");
        }, 1500);
      }

      if (!isEditMode) {
        setFormData({
          foodName: "",
          calories: "",
          protein: "",
          carbohydrates: "",
          fat: "",
          mealType: "Breakfast",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setError(error.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select suggestion
  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
  };

  // CSS Styles dengan responsive design
  const styles = {
    container: {
      maxWidth: "100%",
      margin: "0 auto",
      padding: "clamp(12px, 3vw, 20px)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: "#f8fafc",
      minHeight: "100vh",
      boxSizing: "border-box",
    },
    notification: {
      position: "relative",
      padding: "clamp(12px, 2vw, 14px) clamp(14px, 2.5vw, 18px)",
      marginBottom: "clamp(16px, 3vw, 20px)",
      borderRadius: "10px",
      fontWeight: "500",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "clamp(13px, 2vw, 14px)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      flexWrap: "wrap",
    },
    notificationSuccess: {
      background: "linear-gradient(135deg, #d4edda, #c3e6cb)",
      color: "#155724",
      border: "1px solid #b8dfc2",
    },
    notificationError: {
      background: "linear-gradient(135deg, #f8d7da, #f5c6cb)",
      color: "#721c24",
      border: "1px solid #f1b0b7",
    },
    notificationClose: {
      background: "none",
      border: "none",
      fontSize: "clamp(18px, 3vw, 20px)",
      cursor: "pointer",
      marginLeft: "auto",
      opacity: "0.7",
      padding: "0",
      width: "clamp(20px, 4vw, 24px)",
      height: "clamp(20px, 4vw, 24px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
    },
    sectionHeader: {
      marginBottom: "clamp(16px, 4vw, 24px)",
      textAlign: "center",
    },
    sectionTitle: {
      color: "#1a202c",
      fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
      fontWeight: "700",
      marginBottom: "clamp(4px, 1vw, 8px)",
      background: "linear-gradient(135deg, #4299e1, #667eea)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      lineHeight: "1.2",
    },
    sectionSubtitle: {
      color: "#718096",
      fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
      lineHeight: "1.5",
      margin: "0",
    },
    searchSection: {
      background: "white",
      padding: "clamp(16px, 3vw, 28px)",
      borderRadius: "16px",
      marginBottom: "clamp(16px, 4vw, 24px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      border: "1px solid #e2e8f0",
    },
    searchInputContainer: {
      position: "relative",
      marginBottom: "clamp(12px, 3vw, 20px)",
    },
    searchInput: {
      width: "100%",
      padding:
        "clamp(12px, 2.5vw, 16px) clamp(40px, 8vw, 60px) clamp(12px, 2.5vw, 16px) clamp(12px, 3vw, 20px)",
      border: "2px solid #e2e8f0",
      borderRadius: "12px",
      fontSize: "clamp(14px, 2.5vw, 16px)",
      transition: "all 0.3s ease",
      background: "#fafbfc",
      boxSizing: "border-box",
    },
    searchButton: {
      position: "absolute",
      right: "clamp(4px, 1vw, 8px)",
      top: "50%",
      transform: "translateY(-50%)",
      background: "linear-gradient(135deg, #4299e1, #667eea)",
      border: "none",
      borderRadius: "10px",
      padding: "clamp(8px, 2vw, 12px) clamp(10px, 2.5vw, 16px)",
      cursor: "pointer",
      color: "white",
      transition: "all 0.3s ease",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "clamp(4px, 1vw, 6px)",
      fontSize: "clamp(12px, 2vw, 14px)",
      whiteSpace: "nowrap",
    },
    suggestionsDropdown: {
      position: "absolute",
      top: "100%",
      left: "0",
      right: "0",
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
      zIndex: "1000",
      maxHeight: "clamp(180px, 40vw, 220px)",
      overflowY: "auto",
      marginTop: "4px",
    },
    suggestionItem: {
      padding: "clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 18px)",
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      transition: "all 0.2s ease",
      borderBottom: "1px solid #f7fafc",
      fontSize: "clamp(13px, 2vw, 14px)",
    },
    recentSearches: {
      marginBottom: "clamp(16px, 4vw, 24px)",
    },
    recentTags: {
      display: "flex",
      flexWrap: "wrap",
      gap: "clamp(6px, 1.5vw, 10px)",
      justifyContent: "center",
    },
    recentTag: {
      background: "linear-gradient(135deg, #edf2f7, #e2e8f0)",
      border: "1px solid #cbd5e0",
      borderRadius: "20px",
      padding: "clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 16px)",
      fontSize: "clamp(12px, 2vw, 14px)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      fontWeight: "500",
      color: "#4a5568",
    },
    loadingState: {
      textAlign: "center",
      padding: "clamp(30px, 8vw, 50px) clamp(16px, 4vw, 20px)",
      color: "#718096",
    },
    loadingSpinner: {
      width: "clamp(36px, 8vw, 48px)",
      height: "clamp(36px, 8vw, 48px)",
      border: "4px solid #e2e8f0",
      borderLeft: "4px solid #4299e1",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      margin: "0 auto clamp(12px, 3vw, 20px)",
    },
    searchResultsContainer: {
      marginTop: "clamp(16px, 4vw, 24px)",
      maxHeight: "clamp(300px, 60vw, 400px)",
      overflowY: "auto",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      background: "white",
    },
    searchResultsHeader: {
      padding: "clamp(12px, 3vw, 16px) clamp(14px, 3vw, 20px)",
      background: "linear-gradient(135deg, #f7fafc, #edf2f7)",
      borderBottom: "1px solid #e2e8f0",
      position: "sticky",
      top: "0",
      zIndex: "10",
    },
    searchResultsGrid: {
      display: "flex",
      flexDirection: "column",
      gap: "0",
    },
    foodResultCard: {
      background: "white",
      borderBottom: "1px solid #f7fafc",
      padding: "clamp(14px, 3vw, 20px)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      display: "flex",
      flexDirection: "column",
      gap: "clamp(8px, 2vw, 12px)",
    },
    foodHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "clamp(8px, 2vw, 12px)",
      flexWrap: "wrap",
    },
    foodName: {
      margin: "0",
      color: "#2d3748",
      fontWeight: "600",
      fontSize: "clamp(14px, 2.5vw, 16px)",
      lineHeight: "1.4",
      flex: "1",
      minWidth: "200px",
    },
    foodType: {
      background: "linear-gradient(135deg, #4299e1, #667eea)",
      color: "white",
      padding: "clamp(3px, 1vw, 4px) clamp(8px, 2vw, 12px)",
      borderRadius: "20px",
      fontSize: "clamp(10px, 2vw, 12px)",
      fontWeight: "600",
      whiteSpace: "nowrap",
      flexShrink: "0",
    },
    foodDescription: {
      color: "#718096",
      fontSize: "clamp(12px, 2.5vw, 14px)",
      lineHeight: "1.5",
      margin: "0",
    },
    nutritionInfo: {
      display: "flex",
      gap: "clamp(8px, 2vw, 16px)",
      flexWrap: "wrap",
    },
    nutritionBadge: {
      background: "#f0fff4",
      color: "#22543d",
      padding: "clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)",
      borderRadius: "8px",
      fontSize: "clamp(10px, 2vw, 12px)",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      border: "1px solid #c6f6d5",
    },
    formSection: {
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      padding: "clamp(16px, 3vw, 28px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      marginTop: "clamp(8px, 2vw, 8px)",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "clamp(12px, 3vw, 20px)",
      marginBottom: "clamp(20px, 4vw, 28px)",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
    },
    formLabel: {
      marginBottom: "clamp(6px, 1.5vw, 8px)",
      fontWeight: "600",
      color: "#2d3748",
      fontSize: "clamp(13px, 2vw, 14px)",
    },
    formInput: {
      padding: "clamp(12px, 2.5vw, 14px) clamp(12px, 2.5vw, 16px)",
      border: "2px solid #e2e8f0",
      borderRadius: "10px",
      fontSize: "clamp(14px, 2.5vw, 15px)",
      transition: "all 0.3s ease",
      background: "#fafbfc",
      boxSizing: "border-box",
    },
    nutritionSummary: {
      background: "linear-gradient(135deg, #f7fafc, #edf2f7)",
      borderRadius: "12px",
      padding: "clamp(16px, 3vw, 20px)",
      marginBottom: "clamp(20px, 4vw, 28px)",
      border: "1px solid #e2e8f0",
    },
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "clamp(8px, 2vw, 16px)",
    },
    summaryItem: {
      textAlign: "center",
      padding: "clamp(12px, 2.5vw, 16px)",
      background: "white",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      transition: "all 0.3s ease",
    },
    summaryValue: {
      display: "block",
      fontSize: "clamp(16px, 3vw, 20px)",
      fontWeight: "700",
      color: "#2d3748",
      marginBottom: "4px",
    },
    summaryLabel: {
      fontSize: "clamp(10px, 2vw, 12px)",
      color: "#718096",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    formActions: {
      display: "flex",
      gap: "clamp(12px, 2.5vw, 16px)",
      justifyContent: "flex-end",
      alignItems: "center",
      flexWrap: "wrap",
    },
    cancelButton: {
      padding: "clamp(12px, 2.5vw, 14px) clamp(20px, 4vw, 28px)",
      background: "linear-gradient(135deg, #e2e8f0, #cbd5e0)",
      color: "#4a5568",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "600",
      transition: "all 0.3s ease",
      fontSize: "clamp(13px, 2vw, 14px)",
      whiteSpace: "nowrap",
    },
    submitButton: {
      padding: "clamp(12px, 2.5vw, 14px) clamp(20px, 4vw, 32px)",
      background: "linear-gradient(135deg, #48bb78, #38a169)",
      color: "white",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "600",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "clamp(6px, 1.5vw, 10px)",
      fontSize: "clamp(14px, 2.5vw, 15px)",
      boxShadow: "0 4px 12px rgba(72, 187, 120, 0.3)",
      whiteSpace: "nowrap",
    },
  };

  // Event handlers untuk responsive interactions
  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#4299e1";
    e.target.style.background = "#ffffff";
    e.target.style.boxShadow = "0 0 0 3px rgba(66, 153, 225, 0.1)";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#e2e8f0";
    e.target.style.background = "#fafbfc";
    e.target.style.boxShadow = "none";
  };

  const handleSearchInputMouseEnter = (e) => {
    e.target.style.borderColor = "#cbd5e0";
    e.target.style.background = "#ffffff";
  };

  const handleSearchInputMouseLeave = (e) => {
    if (!e.target.matches(":focus")) {
      e.target.style.borderColor = "#e2e8f0";
      e.target.style.background = "#fafbfc";
    }
  };

  const handleSearchButtonMouseEnter = (e) => {
    if (!isLoading && searchQuery.trim()) {
      e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(66, 153, 225, 0.3)";
    }
  };

  const handleSearchButtonMouseLeave = (e) => {
    if (!isLoading && searchQuery.trim()) {
      e.currentTarget.style.transform = "translateY(-50%) scale(1)";
      e.currentTarget.style.boxShadow = "none";
    }
  };

  const handleRecentTagMouseEnter = (e) => {
    e.currentTarget.style.background =
      "linear-gradient(135deg, #4299e1, #667eea)";
    e.currentTarget.style.color = "white";
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(66, 153, 225, 0.3)";
  };

  const handleRecentTagMouseLeave = (e) => {
    e.currentTarget.style.background =
      "linear-gradient(135deg, #edf2f7, #e2e8f0)";
    e.currentTarget.style.color = "#4a5568";
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  };

  const handleFoodCardMouseEnter = (e) => {
    e.currentTarget.style.background = "#f7fafc";
    e.currentTarget.style.transform = "translateX(4px)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
  };

  const handleFoodCardMouseLeave = (e) => {
    e.currentTarget.style.background = "white";
    e.currentTarget.style.transform = "translateX(0)";
    e.currentTarget.style.boxShadow = "none";
  };

  const handleCancelButtonMouseEnter = (e) => {
    if (!isSubmitting) {
      e.currentTarget.style.background =
        "linear-gradient(135deg, #cbd5e0, #a0aec0)";
      e.currentTarget.style.transform = "translateY(-2px)";
    }
  };

  const handleCancelButtonMouseLeave = (e) => {
    if (!isSubmitting) {
      e.currentTarget.style.background =
        "linear-gradient(135deg, #e2e8f0, #cbd5e0)";
      e.currentTarget.style.transform = "translateY(0)";
    }
  };

  const handleSubmitButtonMouseEnter = (e) => {
    if (!isSubmitting) {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 6px 20px rgba(72, 187, 120, 0.4)";
    }
  };

  const handleSubmitButtonMouseLeave = (e) => {
    if (!isSubmitting) {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(72, 187, 120, 0.3)";
    }
  };

  // Keyframes for spinner animation
  const spinnerStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .search-results-scrollable {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 #f7fafc;
    }
    
    .search-results-scrollable::-webkit-scrollbar {
      width: 6px;
    }
    
    .search-results-scrollable::-webkit-scrollbar-track {
      background: #f7fafc;
      border-radius: 3px;
    }
    
    .search-results-scrollable::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 3px;
    }
    
    .search-results-scrollable::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }

    /* Responsive adjustments for mobile */
    @media (max-width: 768px) {
      .form-actions-mobile {
        flex-direction: column;
        width: 100%;
      }
      
      .form-actions-mobile button {
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .food-header-mobile {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .food-type-mobile {
        align-self: flex-start;
      }
    }
  `;

  return (
    <>
      <style>{spinnerStyle}</style>
      <div style={styles.container}>
        {/* Notification Messages */}
        {(error || success) && (
          <div
            style={{
              ...styles.notification,
              ...(error
                ? styles.notificationError
                : styles.notificationSuccess),
            }}
          >
            <span>{error || success}</span>
            <button
              style={styles.notificationClose}
              onClick={() => {
                setError("");
                setSuccess("");
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Search Section - Hidden in Edit Mode */}
        {!isEditMode && (
          <div style={styles.searchSection}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Cari Makanan</h2>
              <p style={styles.sectionSubtitle}>
                Temukan informasi nutrisi dari database makanan kami
              </p>
            </div>

            <form onSubmit={handleSearch}>
              <div style={styles.searchInputContainer}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => {
                    setShowSuggestions(true);
                    handleInputFocus(e); // Panggil kedua fungsi dengan event yang sama
                  }}
                  placeholder="Ketik nama makanan... contoh: Apple, Nasi Goreng, Roti"
                  style={styles.searchInput}
                  onBlur={(e) => {
                    setTimeout(() => setShowSuggestions(false), 200);
                    handleInputBlur(e); // Panggil kedua fungsi dengan event yang sama
                  }}
                  onMouseEnter={handleSearchInputMouseEnter}
                  onMouseLeave={handleSearchInputMouseLeave}
                />
                <button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  style={{
                    ...styles.searchButton,
                    ...((isLoading || !searchQuery.trim()) && {
                      background: "linear-gradient(135deg, #a0aec0, #cbd5e0)",
                      cursor: "not-allowed",
                    }),
                  }}
                  onMouseEnter={handleSearchButtonMouseEnter}
                  onMouseLeave={handleSearchButtonMouseLeave}
                >
                  {isLoading ? "⏳" : "🔍"} Cari
                </button>

                {/* Auto-suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={styles.suggestionsDropdown}>
                    {suggestions.map((item, index) => (
                      <div
                        key={index}
                        style={styles.suggestionItem}
                        onMouseDown={() => handleSelectSuggestion(item)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f7fafc";
                          e.currentTarget.style.transform = "translateX(4px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "white";
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <span style={{ fontWeight: "600", color: "#2d3748" }}>
                          {item.name}
                        </span>
                        <span
                          style={{
                            color: "#718096",
                            fontSize: "clamp(10px, 2vw, 12px)",
                            background: "#edf2f7",
                            padding: "2px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          Pencarian
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div style={styles.recentSearches}>
                <h4
                  style={{
                    color: "#4a5568",
                    marginBottom: "clamp(12px, 3vw, 16px)",
                    fontSize: "clamp(14px, 2.5vw, 16px)",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  🔍 Pencarian Terakhir
                </h4>
                <div style={styles.recentTags}>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      style={styles.recentTag}
                      onClick={() => setSearchQuery(search.name)}
                      onMouseEnter={handleRecentTagMouseEnter}
                      onMouseLeave={handleRecentTagMouseLeave}
                    >
                      {search.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {isLoading && (
              <div style={styles.loadingState}>
                <div style={styles.loadingSpinner}></div>
                <p
                  style={{
                    fontSize: "clamp(14px, 2.5vw, 16px)",
                    fontWeight: "500",
                  }}
                >
                  Mencari makanan...
                </p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div
                style={styles.searchResultsContainer}
                className="search-results-scrollable"
              >
                <div style={styles.searchResultsHeader}>
                  <h4
                    style={{
                      margin: 0,
                      color: "#2d3748",
                      fontSize: "clamp(14px, 2.5vw, 16px)",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    📊 Ditemukan {searchResults.length} hasil
                  </h4>
                </div>
                <div style={styles.searchResultsGrid}>
                  {searchResults.map((food, index) => (
                    <div
                      key={food.food_id}
                      style={{
                        ...styles.foodResultCard,
                        ...(index === searchResults.length - 1 && {
                          borderBottom: "none",
                        }),
                      }}
                      onClick={() => handleSelectFood(food)}
                      onMouseEnter={handleFoodCardMouseEnter}
                      onMouseLeave={handleFoodCardMouseLeave}
                    >
                      <div
                        style={styles.foodHeader}
                        className="food-header-mobile"
                      >
                        <h5 style={styles.foodName}>{food.food_name}</h5>
                        <span
                          style={styles.foodType}
                          className="food-type-mobile"
                        >
                          {food.food_type}
                        </span>
                      </div>
                      <p style={styles.foodDescription}>
                        {food.food_description}
                      </p>
                      <div style={styles.nutritionInfo}>
                        <div style={styles.nutritionBadge}>
                          📊 Klik untuk lihat nutrisi
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Food Form Section */}
        <div
          style={{
            ...styles.formSection,
            ...(isEditMode && {
              borderColor: " #48bb78",
              background: "linear-gradient(135deg, #f0f9ff, #e6fffa)",
              boxShadow: "0 4px 20px rgba(66, 153, 225, 0.15)",
            }),
          }}
        >
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              {isEditMode ? "✏️ Edit Catatan Makanan" : "📝 Catat Makanan Baru"}
            </h2>
            <p style={styles.sectionSubtitle}>
              {isEditMode
                ? "Perbarui informasi nutrisi makanan Anda"
                : "Isi form di bawah untuk mencatat konsumsi makanan Anda"}
            </p>
          </div>

          <form onSubmit={handleSubmitInternal}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label htmlFor="foodName" style={styles.formLabel}>
                  🍽️ Nama Makanan *
                </label>
                <input
                  type="text"
                  id="foodName"
                  name="foodName"
                  value={formData.foodName}
                  onChange={handleChangeInternal}
                  placeholder="Masukkan nama makanan"
                  required
                  style={styles.formInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="mealType" style={styles.formLabel}>
                  ⏰ Waktu Makan
                </label>
                <select
                  id="mealType"
                  name="mealType"
                  value={formData.mealType}
                  onChange={handleChangeInternal}
                  style={styles.formInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="Breakfast">🍳 Sarapan</option>
                  <option value="Lunch">🍲 Makan Siang</option>
                  <option value="Dinner">🍛 Makan Malam</option>
                  <option value="Snacks">🍎 Cemilan</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="calories" style={styles.formLabel}>
                  🔥 Kalori *
                </label>
                <input
                  type="text"
                  id="calories"
                  name="calories"
                  value={formData.calories}
                  onChange={handleChangeInternal}
                  placeholder="0"
                  required
                  style={styles.formInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="protein" style={styles.formLabel}>
                  💪 Protein (g) *
                </label>
                <input
                  type="text"
                  id="protein"
                  name="protein"
                  value={formData.protein}
                  onChange={handleChangeInternal}
                  placeholder="0"
                  required
                  style={styles.formInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="carbohydrates" style={styles.formLabel}>
                  🌾 Karbohidrat (g) *
                </label>
                <input
                  type="text"
                  id="carbohydrates"
                  name="carbohydrates"
                  value={formData.carbohydrates}
                  onChange={handleChangeInternal}
                  placeholder="0"
                  required
                  style={styles.formInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="fat" style={styles.formLabel}>
                  🥑 Lemak (g) *
                </label>
                <input
                  type="text"
                  id="fat"
                  name="fat"
                  value={formData.fat}
                  onChange={handleChangeInternal}
                  placeholder="0"
                  required
                  style={styles.formInput}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>

            {/* Nutrition Summary */}
            <div style={styles.nutritionSummary}>
              <h4
                style={{
                  margin: "0 0 clamp(12px, 3vw, 16px) 0",
                  color: "#2d3748",
                  fontSize: "clamp(16px, 3vw, 18px)",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                📈 Ringkasan Nutrisi
              </h4>
              <div style={styles.summaryGrid}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {safeParseNumber(formData.calories)}
                  </span>
                  <span style={styles.summaryLabel}>Kalori</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {safeParseNumber(formData.protein)}g
                  </span>
                  <span style={styles.summaryLabel}>Protein</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {safeParseNumber(formData.carbohydrates)}g
                  </span>
                  <span style={styles.summaryLabel}>Karbohidrat</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryValue}>
                    {safeParseNumber(formData.fat)}g
                  </span>
                  <span style={styles.summaryLabel}>Lemak</span>
                </div>
              </div>
            </div>

            <div style={styles.formActions} className="form-actions-mobile">
              {isEditMode && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                  onMouseEnter={handleCancelButtonMouseEnter}
                  onMouseLeave={handleCancelButtonMouseLeave}
                >
                  ❌ Batal
                </button>
              )}
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(isSubmitting && {
                    background: "linear-gradient(135deg, #a0aec0, #cbd5e0)",
                    cursor: "not-allowed",
                  }),
                }}
                disabled={isSubmitting}
                onMouseEnter={handleSubmitButtonMouseEnter}
                onMouseLeave={handleSubmitButtonMouseLeave}
              >
                {isSubmitting ? (
                  <>
                    <div
                      style={{
                        width: "clamp(16px, 3vw, 18px)",
                        height: "clamp(16px, 3vw, 18px)",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderLeft: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    {isEditMode ? "Memperbarui..." : "Menambahkan..."}
                  </>
                ) : isEditMode ? (
                  "💾 Update Makanan"
                ) : (
                  "➕ Tambah Makanan"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default FoodTracker;

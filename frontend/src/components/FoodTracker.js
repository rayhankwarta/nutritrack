import React, { useState } from 'react';
import axios from 'axios';

const FoodTracker = ({ onFoodAdded, onNavigate }) => {
  const [formData, setFormData] = useState({ foodName: '', calories: '', protein: '', carbohydrates: '', fat: '', mealType: 'Breakfast' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/fatsecret/search?query=${searchQuery}`);
      // Fatsecret bisa mengembalikan hasil dalam format berbeda, kita cek dulu
      const results = response.data || [];
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching food:", error);
      alert('Gagal mencari makanan. Silakan coba lagi.');
    }
    setIsLoading(false);
  };

  const handleSelectFood = (food) => {
    // Parsing deskripsi nutrisi
    // Contoh deskripsi: "Per 100g - Calories: 89kcal | Fat: 0.33g | Carbs: 22.84g | Protein: 1.09g"
    const nutritionDesc = food.food_description;
    const caloriesMatch = nutritionDesc.match(/Calories: (\d+\.?\d*)/);
    const fatMatch = nutritionDesc.match(/Fat: (\d+\.?\d*)/);
    const carbsMatch = nutritionDesc.match(/Carbs: (\d+\.?\d*)/);
    const proteinMatch = nutritionDesc.match(/Protein: (\d+\.?\d*)/);

    setFormData({
      ...formData,
      foodName: food.food_name,
      // Gunakan nilai hasil parsing, atau 0 jika tidak ditemukan
      calories: caloriesMatch ? parseFloat(caloriesMatch[1]) : 0,
      fat: fatMatch ? parseFloat(fatMatch[1]) : 0,
      carbohydrates: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
      protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  // --- KITA HANYA BUTUH SATU SET FUNGSI INI UNTUK FORM MANUAL ---
  const handleChangeInternal = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmitInternal = (e) => {
    e.preventDefault();
    const foodDataWithNumbers = {
        ...formData,
        calories: Number(formData.calories), protein: Number(formData.protein),
        carbohydrates: Number(formData.carbohydrates), fat: Number(formData.fat),
    };
    onFoodAdded(foodDataWithNumbers);
    setFormData({ foodName: '', calories: '', protein: '', carbohydrates: '', fat: '', mealType: 'Breakfast' });
    onNavigate('dashboard');
  };
  
  // --- FUNGSI handleChange DAN handleSubmit YANG LAMA SUDAH DIHAPUS ---

  return (
    <div className="food-tracker-container">
      <h2>Cari Makanan</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cth: Banana atau Nasi Goreng" />
        <button type="submit" disabled={isLoading}>{isLoading ? 'Mencari...' : 'Cari'}</button>
      </form>

      {searchResults.length > 0 && (
        <ul className="search-results">
          {searchResults.map(food => (
            <li key={food.food_id} onClick={() => handleSelectFood(food)}>
              <strong>{food.food_name}</strong>
              <small>{food.food_type} - {food.food_description}</small>
            </li>
          ))}
        </ul>
      )}

      <hr className="divider" />

      <h2>Catat Makanan Baru</h2>
      <form onSubmit={handleSubmitInternal} className="food-tracker-form">
        <input type="text" name="foodName" value={formData.foodName} onChange={handleChangeInternal} placeholder="Nama Makanan" required />
        <input type="number" name="calories" value={formData.calories} onChange={handleChangeInternal} placeholder="Kalori" step="0.1" required />
        <input type="number" name="protein" value={formData.protein} onChange={handleChangeInternal} placeholder="Protein (g)" step="0.1" required />
        <input type="number" name="carbohydrates" value={formData.carbohydrates} onChange={handleChangeInternal} placeholder="Karbohidrat (g)" step="0.1" required />
        <input type="number" name="fat" value={formData.fat} onChange={handleChangeInternal} placeholder="Lemak (g)" step="0.1" required />
        <select name="mealType" value={formData.mealType} onChange={handleChangeInternal}>
          <option value="Breakfast">Sarapan</option>
          <option value="Lunch">Makan Siang</option>
          <option value="Dinner">Makan Malam</option>
          <option value="Snacks">Cemilan</option>
        </select>
        <button type="submit">Tambah Makanan</button>
      </form>
    </div>
  );
};

export default FoodTracker;


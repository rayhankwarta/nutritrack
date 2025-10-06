const Food = require('../models/food.model');

const getFoodLogs = async (req, res) => {
  const foods = await Food.find({ user: req.user.id });
  res.status(200).json(foods);
};

const addFoodLog = async (req, res) => {
  const { foodName, calories, protein, carbohydrates, fat, mealType } = req.body;
  if (!foodName || !calories || !protein || !carbohydrates || !fat || !mealType) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }
  const newFood = await Food.create({
    foodName, calories, protein, carbohydrates, fat, mealType,
    user: req.user.id,
  });
  res.status(201).json(newFood);
};

// --- FUNGSI UNTUK MENGHAPUS DATA ---
const deleteFoodLog = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({ message: 'Food log not found' });
    }

    if (food.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await food.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Food log removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getFoodLogs,
  addFoodLog,
  deleteFoodLog, // <-- Pastikan ini diekspor
};
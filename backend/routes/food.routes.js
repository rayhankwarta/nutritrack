const express = require('express');
const router = express.Router();
const { getFoodLogs, addFoodLog, deleteFoodLog, updateFoodLog } = require('../controllers/food.controller');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getFoodLogs).post(protect, addFoodLog);

// --- PASTIKAN BAGIAN INI SAMA PERSIS ---
router.route('/:id')
  .delete(protect, deleteFoodLog)
  .put(protect, updateFoodLog); // <-- Metode .put() harus ada di sini
// ------------------------------------

module.exports = router;
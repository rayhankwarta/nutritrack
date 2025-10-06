const express = require('express');
const router = express.Router();
const { getFoodLogs, addFoodLog, deleteFoodLog } = require('../controllers/food.controller');
const { protect } = require('../middleware/authMiddleware');

// Rute untuk GET (mengambil semua) dan POST (menambah baru)
router.route('/').get(protect, getFoodLogs).post(protect, addFoodLog);

// RUTE BARU UNTUK DELETE berdasarkan ID
// Ini yang akan menangani permintaan DELETE ke /api/foods/some_id_here
router.route('/:id').delete(protect, deleteFoodLog);

module.exports = router;
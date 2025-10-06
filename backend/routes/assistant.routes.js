const express = require('express');
const router = express.Router();
const { getAIAnalysis } = require('../controllers/assistant.controller');
const { protect } = require('../middleware/authMiddleware');

router.post('/analysis', protect, getAIAnalysis);

module.exports = router;
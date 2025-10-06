const express = require('express');
const router = express.Router();
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const translate = require('@iamtraction/google-translate'); // <-- 1. Impor library terjemahan

// Inisialisasi OAuth (tetap sama)
const oauth = OAuth({
  consumer: {
    key: process.env.FATSECRET_KEY,
    secret: process.env.FATSECRET_SECRET,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

router.get('/search', async (req, res) => {
  const { query } = req.query; // Query asli dalam Bahasa Indonesia
  if (!query) {
    return res.status(400).json({ message: 'Query pencarian dibutuhkan' });
  }

  try {
    // --- LANGKAH BARU: TERJEMAHKAN QUERY ---
    console.log(`Menerima query asli: ${query}`);
    
    const translatedResult = await translate(query, { from: 'id', to: 'en' });
    const translatedQuery = translatedResult.text;
    
    console.log(`Query diterjemahkan menjadi: ${translatedQuery}`);
    // -----------------------------------------

    const requestData = {
      url: 'https://platform.fatsecret.com/rest/server.api',
      method: 'GET',
      data: {
        method: 'foods.search',
        search_expression: translatedQuery, // <-- 2. Gunakan hasil terjemahan untuk pencarian
        format: 'json',
      },
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    const response = await axios.get(requestData.url, {
      headers: authHeader,
      params: requestData.data,
    });

    const foods = response.data.foods ? response.data.foods.food : [];
    res.json(foods);

  } catch (error) {
    console.error("Error dalam proses pencarian/terjemahan:", error);
    res.status(500).json({ message: 'Gagal memproses permintaan pencarian', error: error.message });
  }
});
module.exports = router;
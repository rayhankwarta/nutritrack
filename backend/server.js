// 1. Import dependencies (semua yang dibutuhkan)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// --- PERUBAHAN 1: Impor fungsi koneksi database dari file terpisah ---
const connectDB = require('./config/db');

// Impor file rute yang sudah kita buat sebelumnya
const foodRoutes = require('./routes/food.routes');
const fatsecretRoutes = require('./routes/fatsecret.routes');
const userRoutes = require('./routes/user.routes'); 
const assistantRoutes = require('./routes/assistant.routes');
// --- PERUBAHAN 2: Panggil fungsi koneksi database di awal ---
// Ini akan mencoba menghubungkan ke MongoDB saat server pertama kali dijalankan.
connectDB();

// 2. Inisialisasi aplikasi Express
const app = express();
const PORT = process.env.PORT || 5000;

// 3. Gunakan Middleware
app.use(cors()); // Mengizinkan request dari domain lain (frontend kita)
app.use(express.json()); // Mem-parsing body request yang masuk sebagai JSON

// 4. Definisikan dan Gunakan Rute (Routes)
// Rute sederhana untuk menguji apakah server berjalan
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to NutriTrack API! Server is running.' });
});

// Mendelegasikan semua request yang diawali dengan '/api/foods' ke foodRoutes
app.use('/api/foods', foodRoutes);
app.use('/api/fatsecret', fatsecretRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/assistant', assistantRoutes);
// 5. Jalankan server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
}

module.exports = app;



const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Mencoba menghubungkan ke MongoDB menggunakan URI dari file .env
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Opsi ini tidak lagi diperlukan di Mongoose versi 6+, tapi tidak masalah jika ada
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Keluar dari aplikasi jika koneksi gagal
  }
};

module.exports = connectDB;


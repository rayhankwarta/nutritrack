const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true, // Setiap email harus unik
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
    },
    ageCategory: {
      type: String,
      required: [true, 'Please select your age category'],
    },
    gender: {
      type: String,
      required: [true, 'Please select your gender'],
      enum: ['Male', 'Female'], // Hanya boleh diisi Male atau Female
    },
    // Kita akan butuh ini nanti untuk kalkulasi kalori yang lebih akurat
    // weight: { type: Number, required: true },
    // height: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
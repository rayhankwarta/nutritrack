const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
    },
    // === [UPDATE] Field Umur Asli (Angka) ===
    age: {
      type: Number,
      required: [true, "Please add your age"],
    },
    // Kategori tetap disimpan, tapi nanti diisi otomatis oleh Backend
    ageCategory: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: [true, "Please select your gender"],
      enum: ["Male", "Female"],
    },
    height: {
      type: Number,
      required: [true, "Please add your height"],
    },
    weight: {
      type: Number,
      required: [true, "Please add your weight"],
    },
    activityLevel: {
      type: String,
      required: [true, "Please select your activity level"],
      enum: ["sedentary", "light", "moderate", "active", "extreme"],
      default: "sedentary",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);

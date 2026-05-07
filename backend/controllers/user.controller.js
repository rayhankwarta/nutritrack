const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

// Fungsi helper: Tentukan kategori berdasarkan angka umur
const determineAgeCategory = (age) => {
  const ageNum = parseInt(age);
  if (ageNum <= 3) return "balita";
  if (ageNum <= 6) return "anak_kecil";
  if (ageNum <= 9) return "anak_anak";
  if (ageNum <= 12) return "remaja_awal";
  if (ageNum <= 15) return "remaja";
  if (ageNum <= 18) return "remaja_akhir";
  if (ageNum <= 29) return "dewasa_muda";
  if (ageNum <= 49) return "dewasa";
  if (ageNum <= 64) return "pra_lansia";
  return "lansia"; // 65 ke atas
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  // === [UPDATE] Terima 'age' (angka) dari frontend ===
  const { name, email, password, age, gender, height, weight, activityLevel } =
    req.body;

  if (
    !name ||
    !email ||
    !password ||
    !age ||
    !gender ||
    !height ||
    !weight ||
    !activityLevel
  ) {
    return res.status(400).json({ message: "Please add all fields" });
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // === [UPDATE] Hitung category otomatis ===
  const calculatedCategory = determineAgeCategory(age);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    age, // Simpan angka asli
    ageCategory: calculatedCategory, // Simpan kategori hasil hitungan
    gender,
    height,
    weight,
    activityLevel,
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      age: user.age, // Kirim balik angka asli
      ageCategory: user.ageCategory,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      activityLevel: user.activityLevel,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
};

// @desc    Authenticate a user (login)
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      age: user.age, // Kirim balik angka asli
      ageCategory: user.ageCategory,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      activityLevel: user.activityLevel,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: "Invalid credentials" });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = async (req, res) => {
  try {
    const { name, age, gender, height, weight, activityLevel } = req.body;

    // Jika user update umur, kategori juga harus update otomatis
    let updateData = { name, age, gender, height, weight, activityLevel };

    if (age) {
      updateData.ageCategory = determineAgeCategory(age);
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      ageCategory: updatedUser.ageCategory,
      gender: updatedUser.gender,
      height: updatedUser.height,
      weight: updatedUser.weight,
      activityLevel: updatedUser.activityLevel,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error while updating profile." });
  }
};

module.exports = { registerUser, loginUser, updateUserProfile };

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  // --- PERUBAHAN DI SINI ---
  const { name, email, password, ageCategory, gender } = req.body;

  if (!name || !email || !password || !ageCategory || !gender) {
    return res.status(400).json({ message: 'Please add all fields' });
  }
  // -------------------------

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    // --- PERUBAHAN DI SINI ---
    ageCategory,
    // -------------------------
    gender,
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      // --- PERUBAHAN DI SINI ---
      ageCategory: user.ageCategory,
      // -------------------------
      gender: user.gender,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      // --- PERUBAHAN DI SINI ---
      ageCategory: user.ageCategory,
      // -------------------------
      gender: user.gender,
      token: generateToken(user._id),
    });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
};

module.exports = { registerUser, loginUser };
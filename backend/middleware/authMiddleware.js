const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Get token from header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      // === INI ADALAH PERBAIKAN KRITIS ===
      // 4. Cek apakah user ada di database
      if (!req.user) {
        // Jika tidak ada, kirim error dan HENTIKAN eksekusi
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      // === SELESAI ===

      // 5. Jika user ada, lanjut ke controller
      next();

    } catch (error) {
      console.error(error);
      // Jika token gagal (expired, salah, dll), kirim error dan HENTIKAN
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // Ini adalah pengganti 'if (!token)'
    // Jika tidak ada header auth sama sekali, kirim error dan HENTIKAN
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin, onSwitchMode, onBack, successMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/users/login', { email, password });
      onLogin(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal.');
    }
  };

  return (
    <div className="auth-form">
      <button onClick={onBack} className="back-button">← Kembali ke Beranda</button>
      <h2>Masuk ke NutriTrack</h2>
      {successMessage && <p className="success-message">{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Login</button>
      </form>
      <div className="auth-switch">
        <p>Belum punya akun? <button onClick={onSwitchMode}>Daftar di sini</button></p>
      </div>
    </div>
  );
};

export default Login;
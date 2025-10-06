import React, { useState } from 'react';
import axios from 'axios';

const Register = ({ onSuccess, onSwitchMode, onBack }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', ageCategory: 'dewasa_muda', gender: 'Male' });
  const [error, setError] = useState('');

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 6) { return setError('Password minimal harus 6 karakter.'); }
    try {
      await axios.post('/api/users/register', formData);
      onSuccess('Registrasi berhasil! Silakan masuk dengan akun baru Anda.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registrasi gagal.');
    }
  };

  return (
    <div className="auth-form">
      <button onClick={onBack} className="back-button">← Kembali ke Beranda</button>
      <h2>Buat Akun Baru</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" onChange={handleChange} placeholder="Nama Lengkap" required />
        <input type="email" name="email" onChange={handleChange} placeholder="Email" required />
        <input type="password" name="password" onChange={handleChange} placeholder="Password (min. 6 karakter)" required />
        <select name="ageCategory" onChange={handleChange} value={formData.ageCategory}>
          <option value="balita">Balita (1 – 3 tahun)</option>
          <option value="anak_kecil">Anak-anak kecil (4 – 6 tahun)</option>
          <option value="anak_anak">Anak-anak (7 – 9 tahun)</option>
          <option value="remaja_awal">Remaja awal (10 – 12 tahun)</option>
          <option value="remaja">Remaja (13 – 15 tahun)</option>
          <option value="remaja_akhir">Remaja akhir (16 – 18 tahun)</option>
          <option value="dewasa_muda">Dewasa muda (19 – 29 tahun)</option>
          <option value="dewasa">Dewasa (30 – 49 tahun)</option>
          <option value="pra_lansia">Pra-lansia (50 – 64 tahun)</option>
          <option value="lansia">Lansia (≥ 65 tahun)</option>
        </select>
        <select name="gender" onChange={handleChange} value={formData.gender}>
          <option value="Male">Laki-laki</option>
          <option value="Female">Perempuan</option>
        </select>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <div className="auth-switch">
        <p>Sudah punya akun? <button onClick={onSwitchMode}>Masuk di sini</button></p>
      </div>
    </div>
  );
};

export default Register;
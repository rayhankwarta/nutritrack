import React, { useState } from "react";
import axios from "axios";

const Register = ({ onSuccess, onSwitchMode, onBack }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "", // Input sekarang berupa angka
    gender: "Male",
    height: "",
    weight: "",
    activityLevel: "sedentary",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password.length < 6) {
      return setError("Password minimal harus 6 karakter.");
    }
    try {
      // Backend akan otomatis menghitung ageCategory dari 'age'
      console.log("Registering:", formData);
      await axios.post("/api/users/register", formData);
      onSuccess("Registrasi berhasil! Silakan masuk dengan akun baru Anda.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registrasi gagal.");
    }
  };

  return (
    <div className="auth-form">
      <button onClick={onBack} className="back-button">
        ← Kembali ke Beranda
      </button>
      <h2>Buat Akun Baru</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          onChange={handleChange}
          placeholder="Nama Lengkap"
          required
        />
        <input
          type="email"
          name="email"
          onChange={handleChange}
          placeholder="Email"
          required
        />
        <input
          type="password"
          name="password"
          onChange={handleChange}
          placeholder="Password (min. 6 karakter)"
          required
        />

        {/* === [UPDATE] INPUT UMUR ANGKA === */}
        <input
          type="number"
          name="age"
          onChange={handleChange}
          placeholder="Usia (Tahun)"
          required
          min="1"
          max="120"
        />

        <input
          type="number"
          name="height"
          onChange={handleChange}
          placeholder="Tinggi Badan (cm)"
          required
        />
        <input
          type="number"
          name="weight"
          onChange={handleChange}
          placeholder="Berat Badan (kg)"
          required
        />

        <label
          style={{
            display: "block",
            marginTop: "10px",
            marginBottom: "5px",
            fontSize: "0.9em",
            color: "#555",
          }}
        >
          Tingkat Aktivitas Fisik:
        </label>
        <select
          name="activityLevel"
          onChange={handleChange}
          value={formData.activityLevel}
          required
        >
          <option value="sedentary">
            Sedentary (Jarang Olahraga / Kerja Duduk)
          </option>
          <option value="light">Light (Olahraga 1-3 hari/minggu)</option>
          <option value="moderate">Moderate (Olahraga 3-5 hari/minggu)</option>
          <option value="active">Active (Olahraga 6-7 hari/minggu)</option>
          <option value="extreme">Extreme (Fisik Berat / Atlet)</option>
        </select>

        <label
          style={{
            display: "block",
            marginTop: "10px",
            marginBottom: "5px",
            fontSize: "0.9em",
            color: "#555",
          }}
        >
          Jenis Kelamin:
        </label>
        <select name="gender" onChange={handleChange} value={formData.gender}>
          <option value="Male">Laki-laki</option>
          <option value="Female">Perempuan</option>
        </select>

        {error && <p className="error-message">{error}</p>}
        <button type="submit">Register</button>
      </form>
      <div className="auth-switch">
        <p>
          Sudah punya akun?{" "}
          <button onClick={onSwitchMode}>Masuk di sini</button>
        </p>
      </div>
    </div>
  );
};

export default Register;

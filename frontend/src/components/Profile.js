import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const Profile = ({ user, onUserUpdate, onNavigate }) => {
  // 1. UPDATE STATE: Menambahkan activityLevel dan age
  const [formData, setFormData] = useState({
    name: "",
    age: "", // Field baru untuk Umur Angka
    ageCategory: "",
    gender: "",
    height: "",
    weight: "",
    activityLevel: "",
  });

  // 2. UPDATE USE EFFECT: Mengisi data awal dari user props
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        age: user.age || "", // Load data umur asli (angka)
        ageCategory: user.ageCategory || "dewasa_muda",
        gender: user.gender || "Male",
        height: user.height || "",
        weight: user.weight || "",
        activityLevel: user.activityLevel || "sedentary",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Data age & activityLevel otomatis terkirim
      const response = await axios.put("/api/users/profile", formData);
      onUserUpdate(response.data);
      toast.success("Profil berhasil diperbarui");
      onNavigate("dashboard");
    } catch (error) {
      toast.error("Gagal memperbarui profil");
      console.error("Update profile error:", error);
    }
  };

  if (!user) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const ageOptions = [
    { value: "balita", label: "Balita (1–3 tahun)" },
    { value: "anak_kecil", label: "Anak kecil (4–6 tahun)" },
    { value: "anak_anak", label: "Anak-anak (7–9 tahun)" },
    { value: "remaja_awal", label: "Remaja awal (10–12 tahun)" },
    { value: "remaja", label: "Remaja (13–15 tahun)" },
    { value: "remaja_akhir", label: "Remaja akhir (16–18 tahun)" },
    { value: "dewasa_muda", label: "Dewasa muda (19–29 tahun)" },
    { value: "dewasa", label: "Dewasa (30–49 tahun)" },
    { value: "pra_lansia", label: "Pra-lansia (50–64 tahun)" },
    { value: "lansia", label: "Lansia (≥65 tahun)" },
  ];

  // 3. DEFINE OPTIONS: Pilihan aktivitas fisik
  const activityOptions = [
    { value: "sedentary", label: "Sedentary (Jarang Olahraga / Kerja Duduk)" },
    { value: "light", label: "Light (Olahraga 1-3 hari/minggu)" },
    { value: "moderate", label: "Moderate (Olahraga 3-5 hari/minggu)" },
    { value: "active", label: "Active (Olahraga 6-7 hari/minggu)" },
    { value: "extreme", label: "Extreme (Fisik Berat / Atlet)" },
  ];

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profil</h1>
        <p>
          Perbarui informasi Anda untuk rekomendasi nutrisi yang lebih akurat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-field">
          <label htmlFor="name">Nama lengkap</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* 4. UPDATE FORM ROW: Menambahkan Input Umur (Age) */}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="age">Usia (Tahun)</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
              min="1"
              max="120"
              placeholder="Contoh: 25"
            />
          </div>

          <div className="form-field">
            <label htmlFor="height">
              Tinggi (cm)
              {user.height && (
                <span className="previous"> (Last: {user.height})</span>
              )}
            </label>
            <input
              type="number"
              id="height"
              name="height"
              value={formData.height}
              onChange={handleChange}
              required
              min="50"
              max="250"
            />
          </div>

          <div className="form-field">
            <label htmlFor="weight">
              Berat (kg)
              {user.weight && (
                <span className="previous"> (Last: {user.weight})</span>
              )}
            </label>
            <input
              type="number"
              id="weight"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              required
              min="10"
              max="300"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="activityLevel">Tingkat Aktivitas Fisik (PAL)</label>
          <select
            id="activityLevel"
            name="activityLevel"
            value={formData.activityLevel}
            onChange={handleChange}
            required
          >
            {activityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Kategori Usia (Opsional/Disabled karena sudah otomatis dari umur) */}
        <div className="form-field">
          <label htmlFor="ageCategory">Kategori usia (Otomatis)</label>
          <select
            id="ageCategory"
            name="ageCategory"
            value={formData.ageCategory}
            onChange={handleChange}
            disabled // Disabled agar user fokus mengisi Umur angka
            style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
          >
            {ageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Jenis kelamin</label>
          <div className="radio-group">
            <label className="radio-item">
              <input
                type="radio"
                name="gender"
                value="Male"
                checked={formData.gender === "Male"}
                onChange={handleChange}
              />
              <span>Laki-laki</span>
            </label>
            <label className="radio-item">
              <input
                type="radio"
                name="gender"
                value="Female"
                checked={formData.gender === "Female"}
                onChange={handleChange}
              />
              <span>Perempuan</span>
            </label>
          </div>
        </div>

        <button type="submit" className="submit-button">
          Simpan perubahan
        </button>
      </form>

      <style jsx>{`
        .profile-page {
          max-width: 680px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica,
            Arial, sans-serif;
          color: #111827;
          line-height: 1.6;
        }

        .profile-header h1 {
          font-weight: 700;
          font-size: 1.875rem;
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .profile-header p {
          color: #6b7280;
          font-size: 1.125rem;
          margin: 0;
        }

        .profile-form {
          margin-top: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-field label {
          font-weight: 600;
          font-size: 0.9375rem;
          color: #1f2937;
          display: flex;
          justify-content: space-between;
        }

        .previous {
          font-weight: normal;
          color: #9ca3af;
          font-size: 0.875rem;
        }

        .form-field input,
        .form-field select {
          padding: 0.875rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
        }

        /* Update Grid untuk 3 Kolom (Umur, Tinggi, Berat) */
        .form-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .radio-group {
          display: flex;
          gap: 2rem;
        }

        .radio-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          cursor: pointer;
          font-weight: 500;
          color: #374151;
        }

        .radio-item input {
          width: 18px;
          height: 18px;
          accent-color: #4f46e5;
        }

        .submit-button {
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: background 0.2s;
        }

        .submit-button:hover {
          background: #4338ca;
        }

        .submit-button:active {
          transform: translateY(0);
        }

        .profile-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive */
        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .radio-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .profile-header h1 {
            font-size: 1.5rem;
          }

          .profile-header p {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;

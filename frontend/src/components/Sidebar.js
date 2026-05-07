// ...existing code...
import React from "react";
import logo from "../img/rembg-nutritrack.png";

const Sidebar = ({
  user,
  onNavigate,
  onLogout,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <>
      {/* Overlay ini akan muncul di mobile untuk menggelapkan konten saat sidebar terbuka */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={onToggleSidebar}
      ></div>

      {/* Tambahkan class 'open' secara dinamis untuk mengontrol visibilitas */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          {/* Ganti placeholder logo dengan gambar nyata */}
          <img src={logo} alt="NutriTrack Logo" className="sidebar-logo" />
          <span className="app-name">NutriTrack</span>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => onNavigate("dashboard")}>
            📊<span className="nav-text">Dashboard</span>
          </button>
          <button onClick={() => onNavigate("tracker")}>
            📝<span className="nav-text">Lacak Makanan</span>
          </button>
          <button onClick={() => onNavigate("analytics")}>
            📈<span className="nav-text">Analisis</span>
          </button>
          <button onClick={() => onNavigate("assistant")}>
            🤖<span className="nav-text">Asisten Nutrisi</span>
          </button>
          <button onClick={() => onNavigate("profile")}>
            ⚙️<span className="nav-text">Profil</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <span className="greeting">Halo,</span>
            <span className="user-name">{user ? user.name : "Pengguna"}</span>
          </div>
          <button onClick={onLogout} className="logout-button-sidebar">
            🚪<span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
// ...existing code...
// ...existing code...
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";
import toast, { Toaster } from "react-hot-toast";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import FoodTracker from "./components/FoodTracker";
import Analytics from "./components/Analytics";
import NutritionAssistant from "./components/NutritionAssistant";
import Profile from "./components/Profile";
import Login from "./components/Login";
import Register from "./components/Register";
import LandingPage from "./components/LandingPage";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [foodLogs, setFoodLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setFoodLogs([]);
    setView("landing");
  }, [setUser, setFoodLogs, setView]);

  const fetchFoodLogs = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get("/api/foods");
      setFoodLogs(response.data);
    } catch (error) {
      console.error("Error fetching food logs:", error);
      if (error.response && error.response.status !== 401) {
        toast.error("Gagal memuat data makanan.");
      }
    }
  }, [user]);

  useEffect(() => {
    const loggedInUser = localStorage.getItem("user");
    if (loggedInUser) {
      const userData = JSON.parse(loggedInUser);
      setUser(userData);
      axios.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;
    }
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn("Unauthorized (401) detected. Logging out.");
          toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [handleLogout]);

  useEffect(() => {
    if (user) {
      fetchFoodLogs();
    }
  }, [user, fetchFoodLogs]);

  const handleLogin = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    axios.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;
    setUser(userData);
    setCurrentPage("dashboard");
  };

  const handleRegistrationSuccess = (message) => {
    setSuccessMessage(message);
    setAuthMode("login");
    setView("auth");
  };

  const handleFoodAdded = async (newFoodData) => {
    try {
      const response = await axios.post("/api/foods", newFoodData);
      setFoodLogs((prevLogs) => [...prevLogs, response.data]);
      toast.success("Data makanan berhasil ditambahkan!");
    } catch (error) {
      console.error("Detail Error saat menambah makanan:", error);
      let errorMessage = "Gagal menambahkan data makanan.";

      if (error.response) {
        if (error.response.status !== 401) {
          errorMessage = error.response.data.message || errorMessage;
          toast.error(errorMessage);
        }
      } else if (error.request) {
        console.error("Tidak ada respons dari server:", error.request);
        toast.error("Tidak bisa terhubung ke server.");
      } else {
        console.error("Error setting up request:", error.message);
        toast.error(`Error: ${error.message}`);
      }
    }
  };

  const handleDeleteFood = async (idToDelete) => {
    try {
      await axios.delete(`/api/foods/${idToDelete}`);
      setFoodLogs((prev) => prev.filter((log) => log._id !== idToDelete));
      toast.success("Data berhasil dihapus.");
    } catch (error) {
      console.error("Error deleting food log:", error);
      if (error.response && error.response.status !== 401) {
        toast.error(error.response?.data?.message || "Gagal menghapus data.");
      } else if (!error.response) {
        toast.error("Gagal menghapus data.");
      }
    }
  };

  const handleUserUpdate = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem("user", JSON.stringify(updatedUserData));
  };

  const handleUpdateFood = async (id, updatedFoodData) => {
    try {
      const response = await axios.put(`/api/foods/${id}`, updatedFoodData);
      setFoodLogs((prev) => prev.map((log) => (log._id === id ? response.data : log)));
      setEditingLog(null);
      setCurrentPage("dashboard");
      toast.success("Data berhasil diperbarui.");
    } catch (error) {
      console.error("Error updating food log:", error);
      if (error.response && error.response.status !== 401) {
        toast.error(error.response?.data?.message || "Gagal memperbarui data.");
      } else if (!error.response) {
        toast.error("Gagal memperbarui data.");
      }
    }
  };

  const handleEditFood = (log) => {
    setEditingLog(log);
    setCurrentPage("tracker");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "tracker":
        return (
          <FoodTracker
            onFoodAdded={handleFoodAdded}
            onNavigate={setCurrentPage}
            editingLog={editingLog}
            onFoodUpdated={handleUpdateFood}
            onCancelEdit={() => {
              setEditingLog(null);
              setCurrentPage("dashboard");
            }}
          />
        );
      case "analytics":
        return <Analytics foodLogs={foodLogs} user={user} />;
      case "assistant":
        return <NutritionAssistant foodLogs={foodLogs} user={user} />;
      case "profile":
        return (
          <Profile
            user={user}
            onUserUpdate={handleUserUpdate}
            onNavigate={setCurrentPage}
          />
        );
      default:
        return (
          <Dashboard
            foodLogs={foodLogs}
            user={user}
            onDelete={handleDeleteFood}
            onEdit={handleEditFood}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  return (
    <div className="App">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {user ? (
        <div className="app-layout">
          <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
          <Sidebar
            user={user}
            onNavigate={(page) => {
              setCurrentPage(page);
              setIsSidebarOpen(false);
            }}
            onLogout={handleLogout}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          <main className="main-content">{renderPage()}</main>
        </div>
      ) : (
        <>
          {view === "landing" && (
            <LandingPage onGetStarted={() => setView("auth")} />
          )}
          {view === "auth" && (
            <div className="auth-container">
              {authMode === "login" ? (
                <Login
                  onLogin={handleLogin}
                  onSwitchMode={() => {
                    setAuthMode("register");
                    setSuccessMessage("");
                  }}
                  onBack={() => setView("landing")}
                  successMessage={successMessage}
                />
              ) : (
                <Register
                  onSuccess={handleRegistrationSuccess}
                  onSwitchMode={() => setAuthMode("login")}
                  onBack={() => setView("landing")}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
// ...existing code...
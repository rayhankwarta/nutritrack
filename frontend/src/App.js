import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar'; 
import Dashboard from './components/Dashboard';
import FoodTracker from './components/FoodTracker';
import Analytics from './components/Analytics';
import Login from './components/Login';
import Register from './components/Register';
import LandingPage from './components/LandingPage';
import NutritionAssistant from './components/NutritionAssistant';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [foodLogs, setFoodLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchFoodLogs = async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/foods');
      setFoodLogs(response.data);
    } catch (error) {
      console.error("Error fetching food logs:", error);
    }
  };

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const userData = JSON.parse(loggedInUser);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    }
  }, []);

  useEffect(() => {
    fetchFoodLogs();
  }, [user]);

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setFoodLogs([]);
    setView('landing');
  };

  const handleRegistrationSuccess = (message) => {
    setSuccessMessage(message);
    setAuthMode('login');
    setView('auth');
  };

  const handleFoodAdded = async (newFoodData) => {
    try {
      await axios.post('/api/foods', newFoodData);
      fetchFoodLogs();
    } catch (error) {
      console.error("Error adding food log:", error);
    }
  };

   const handleDeleteFood = async (idToDelete) => {
    try {
      // URL ini sekarang akan cocok dengan rute di backend
      await axios.delete(`/api/foods/${idToDelete}`);
      setFoodLogs(foodLogs.filter((log) => log._id !== idToDelete));
    } catch (error) {
      console.error('Error deleting food log:', error);
      alert('Gagal menghapus data.');
    }
  };
  
  // --- BAGIAN INI DIPERBAIKI ---
  const renderPage = () => {
    switch (currentPage) {
      case 'tracker':
        return <FoodTracker 
                  onFoodAdded={handleFoodAdded} 
                  onNavigate={setCurrentPage} 
               />;
      
      // --- PERBARUI BARIS INI ---
      case 'analytics':
        // Kirim 'user' ke Analytics agar bisa menghitung target kalori
        return <Analytics foodLogs={foodLogs} user={user} />;

        case 'assistant':
        return <NutritionAssistant foodLogs={foodLogs} user={user} />;
      // ---------------------------

      default:
        return <Dashboard 
                  foodLogs={foodLogs} 
                  user={user} 
                  onDelete={handleDeleteFood} 
               />;
    }
  };
  // --------------------------------

  return (
    <div className="App">
      {user ? (
        <>
          <div className="app-layout">
          <Sidebar 
            user={user}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
          />
          <main className="main-content">
            {renderPage()}
          </main>
        </div>
        </>
      ) : (
        <>
          {view === 'landing' && <LandingPage onGetStarted={() => setView('auth')} />}
          {view === 'auth' && (
            <div className="auth-container">
              {authMode === 'login' ? (
                <Login 
                  onLogin={handleLogin} 
                  onSwitchMode={() => { setAuthMode('register'); setSuccessMessage(''); }} 
                  onBack={() => setView('landing')}
                  successMessage={successMessage}
                />
              ) : (
                <Register 
                  onSuccess={handleRegistrationSuccess}
                  onSwitchMode={() => setAuthMode('login')} 
                  onBack={() => setView('landing')}
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
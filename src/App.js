import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import CallRoom from './pages/CallRoom';
import ChatHistory from './pages/ChatHistory';
import CallHistory from './pages/CallHistory';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Followers from './pages/Followers';
import Reports from './pages/Reports';
import Appointments from './pages/Appointments';
import MyPujas from './pages/MyPujas';
import PujaOrders from './pages/PujaOrders';
import CreatePuja from './pages/CreatePuja';
import Reviews from './pages/Reviews';
import Horoscope from './pages/Horoscope';
import Kundali from './pages/Kundali';
import KundaliMatching from './pages/KundaliMatching';
import Panchang from './pages/Panchang';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import StaticPage from './pages/StaticPage';
import Contact from './pages/Contact';
import Layout from './components/Layout';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { astrologer, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  return astrologer ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat-room/:chatId" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
      <Route path="/call-room/:callId" element={<ProtectedRoute><CallRoom /></ProtectedRoute>} />
      <Route path="/chat-history" element={<ProtectedRoute><ChatHistory /></ProtectedRoute>} />
      <Route path="/call-history" element={<ProtectedRoute><CallHistory /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
      <Route path="/followers" element={<ProtectedRoute><Followers /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
      <Route path="/my-pujas" element={<ProtectedRoute><MyPujas /></ProtectedRoute>} />
      <Route path="/puja-orders" element={<ProtectedRoute><PujaOrders /></ProtectedRoute>} />
      <Route path="/create-puja" element={<ProtectedRoute><CreatePuja /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="/horoscope" element={<ProtectedRoute><Horoscope /></ProtectedRoute>} />
      <Route path="/kundali" element={<ProtectedRoute><Kundali /></ProtectedRoute>} />
      <Route path="/kundali-matching" element={<ProtectedRoute><KundaliMatching /></ProtectedRoute>} />
      <Route path="/panchang" element={<ProtectedRoute><Panchang /></ProtectedRoute>} />
      <Route path="/blog" element={<ProtectedRoute><BlogList /></ProtectedRoute>} />
      <Route path="/blog/:id" element={<ProtectedRoute><BlogDetail /></ProtectedRoute>} />
      <Route path="/about" element={<ProtectedRoute><StaticPage /></ProtectedRoute>} />
      <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
      <Route path="/privacy-policy" element={<ProtectedRoute><StaticPage /></ProtectedRoute>} />
      <Route path="/terms-condition" element={<ProtectedRoute><StaticPage /></ProtectedRoute>} />
      <Route path="/refund-policy" element={<ProtectedRoute><StaticPage /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import PartnersPage from './pages/PartnersPage';
import PartnerDashboard from './pages/PartnerDashboard';
import CurrentOrder from './pages/CurrentOrder';
import OrderHistory from './pages/OrderHistory';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';

// Components
import Layout from './components/common/Layout';

// Styles
import './index.css';

// Simple Loading Component
const SimpleLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Loading Zomato Ops Pro...</p>
    </div>
  </div>
);

// Simple Protected Route
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return <SimpleLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    const redirectPath = role === 'partner' ? '/partner-dashboard' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

// App Content Component
const AppContent = () => {
  const { isDarkMode } = useTheme();
  const { loading } = useAuth();

  if (loading) {
    return <SimpleLoading />;
  }

  return (
    <Router>
      <div className={`App min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Manager Routes */}
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="orders" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <OrdersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="partners" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <PartnersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="analytics" 
              element={
                <ProtectedRoute requiredRole="manager">
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            
            {/* Partner Routes */}
            <Route 
              path="partner-dashboard" 
              element={
                <ProtectedRoute requiredRole="partner">
                  <PartnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="current-order" 
              element={
                <ProtectedRoute requiredRole="partner">
                  <CurrentOrder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="order-history" 
              element={
                <ProtectedRoute requiredRole="partner">
                  <OrderHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="profile" 
              element={
                <ProtectedRoute requiredRole="partner">
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* Shared Routes */}
            <Route 
              path="settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* Toast Configuration */}
        <Toaster
          position="bottom-right"
          reverseOrder={false}
          gutter={8}
          containerClassName="z-50"
          toastOptions={{
            duration: 4000,
            style: {
              background: isDarkMode ? '#374151' : '#ffffff',
              color: isDarkMode ? '#f3f4f6' : '#111827',
              border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: isDarkMode 
                ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: isDarkMode ? '#374151' : '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: isDarkMode ? '#374151' : '#ffffff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
};

// Main App Component with Providers
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import PartnersPage from './pages/PartnersPage';
import PartnerDashboard from './pages/PartnerDashboard';
import AvailableOrders from './pages/AvailableOrders';
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
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="orders" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <OrdersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="partners" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <PartnersPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="analytics" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Analytics />
                </ProtectedRoute>
              } 
            />
            
            {/* Partner Routes */}
            <Route 
              path="partner-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <PartnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="available-orders" 
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <AvailableOrders />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="current-order" 
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <CurrentOrder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="order-history" 
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <OrderHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="profile" 
              element={
                <ProtectedRoute allowedRoles={['partner']}>
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
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
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
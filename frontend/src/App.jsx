import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Layout Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

// Dashboard Components
import RestaurantDashboard from './components/dashboard/RestaurantDashboard';
import DeliveryDashboard from './components/dashboard/DeliveryDashboard';

// Order Components
import OrderList from './components/orders/OrderList';
import OrderDetails from './components/orders/OrderDetails';
import CreateOrder from './components/orders/CreateOrder';
import OrderTracking from './components/orders/OrderTracking';

// Partner Components
import PartnerList from './components/partners/PartnerList';
import PartnerProfile from './components/partners/PartnerProfile';
import PartnerStats from './components/partners/PartnerStats';

// Profile Components
import Profile from './components/profile/Profile';

import './App.css';

function App() {
  return (
    <div className="App h-full">
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <SocketProvider>
              <Router>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <Navigate to="/dashboard" replace />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Dashboard Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <RoleBasedRoute allowedRoles={['restaurant_manager']}>
                          <RestaurantDashboard />
                        </RoleBasedRoute>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/delivery-dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <RoleBasedRoute allowedRoles={['delivery_partner']}>
                          <DeliveryDashboard />
                        </RoleBasedRoute>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Order Management Routes */}
                  <Route path="/orders" element={
                    <ProtectedRoute>
                      <Layout>
                        <OrderList />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders/new" element={
                    <ProtectedRoute>
                      <Layout>
                        <RoleBasedRoute allowedRoles={['restaurant_manager']}>
                          <CreateOrder />
                        </RoleBasedRoute>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders/:id" element={
                    <ProtectedRoute>
                      <Layout>
                        <OrderDetails />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders/:id/track" element={
                    <ProtectedRoute>
                      <Layout>
                        <OrderTracking />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Partner Management Routes */}
                  <Route path="/partners" element={
                    <ProtectedRoute>
                      <Layout>
                        <RoleBasedRoute allowedRoles={['restaurant_manager']}>
                          <PartnerList />
                        </RoleBasedRoute>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/partners/:id" element={
                    <ProtectedRoute>
                      <Layout>
                        <PartnerProfile />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/my-stats" element={
                    <ProtectedRoute>
                      <Layout>
                        <RoleBasedRoute allowedRoles={['delivery_partner']}>
                          <PartnerStats />
                        </RoleBasedRoute>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Profile Routes */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Fallback Route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Router>
            </SocketProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

// Layout wrapper component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App; 
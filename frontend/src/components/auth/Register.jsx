import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'restaurant_manager',
    firstName: '',
    lastName: '',
    phone: '',
    vehicleType: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const { register, isLoading, error, isAuthenticated, clearError } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  const roles = [
    {
      value: 'restaurant_manager',
      label: 'Restaurant Manager',
      icon: '🏪',
      description: 'Manage orders, assign delivery partners'
    },
    {
      value: 'delivery_partner',
      label: 'Delivery Partner',
      icon: '🛵',
      description: 'Deliver orders, earn money'
    }
  ];

  const vehicleTypes = [
    { value: 'bike', label: '🏍️ Motorcycle', speed: 'Fast' },
    { value: 'bicycle', label: '🚲 Bicycle', speed: 'Eco-friendly' },
    { value: 'scooter', label: '🛵 Scooter', speed: 'Efficient' },
    { value: 'car', label: '🚗 Car', speed: 'Comfortable' }
  ];

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) clearError();
  };

  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, role }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.role) {
          showError('Please select your role');
          return false;
        }
        return true;
      case 2:
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          showError('Please enter your full name');
          return false;
        }
        if (!formData.phone.trim()) {
          showError('Please enter your phone number');
          return false;
        }
        if (formData.role === 'delivery_partner' && !formData.vehicleType) {
          showError('Please select your vehicle type');
          return false;
        }
        return true;
      case 3:
        if (!formData.username.trim()) {
          showError('Please enter a username');
          return false;
        }
        if (!formData.email.trim()) {
          showError('Please enter your email');
          return false;
        }
        if (!formData.password) {
          showError('Please enter a password');
          return false;
        }
        if (formData.password.length < 6) {
          showError('Password must be at least 6 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          showError('Passwords do not match');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;

    const userData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      role: formData.role
    };

    if (formData.role === 'delivery_partner') {
      userData.vehicleType = formData.vehicleType;
    }

    const result = await register(userData);
    
    if (result.success) {
      success(`Welcome to FoodFlow, ${result.data.user.firstName}!`);
      navigate('/dashboard');
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Choose Your Role</h3>
        <p className="text-gray-300">Select how you want to use FoodFlow</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {roles.map((role) => (
          <div
            key={role.value}
            className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              formData.role === role.value
                ? 'border-orange-400 bg-gradient-to-br from-orange-500/20 to-pink-500/20 shadow-2xl'
                : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'
            }`}
            onClick={() => handleRoleSelect(role.value)}
          >
            <div className="flex items-center space-x-4">
              <div className="text-4xl">{role.icon}</div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-lg">{role.label}</h4>
                <p className="text-gray-300 text-sm">{role.description}</p>
              </div>
              {formData.role === role.value && (
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Personal Information</h3>
        <p className="text-gray-300">Tell us about yourself</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">First Name</label>
          <input
            name="firstName"
            type="text"
            required
            className="block w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">Last Name</label>
          <input
            name="lastName"
            type="text"
            required
            className="block w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-white/90">Phone Number</label>
        <input
          name="phone"
          type="tel"
          required
          className="block w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
          placeholder="+91 98765 43210"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>

      {formData.role === 'delivery_partner' && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">Vehicle Type</label>
          <div className="grid grid-cols-2 gap-3">
            {vehicleTypes.map((vehicle) => (
              <div
                key={vehicle.value}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 ${
                  formData.vehicleType === vehicle.value
                    ? 'border-orange-400 bg-gradient-to-br from-orange-500/20 to-pink-500/20'
                    : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, vehicleType: vehicle.value }))}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{vehicle.label.split(' ')[0]}</div>
                  <div className="font-semibold text-white text-sm">{vehicle.label.split(' ')[1]}</div>
                  <div className="text-xs text-gray-300">{vehicle.speed}</div>
                </div>
                {formData.vehicleType === vehicle.value && (
                  <div className="absolute top-2 right-2">
                    <div className="h-4 w-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Account Details</h3>
        <p className="text-gray-300">Create your login credentials</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">Username</label>
          <input
            name="username"
            type="text"
            required
            className="block w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
            placeholder="johndoe123"
            value={formData.username}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">Email</label>
          <input
            name="email"
            type="email"
            required
            className="block w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
            placeholder="john@example.com"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="block w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-400 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/90">Confirm Password</label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              className="block w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-orange-400 transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transform transition-all duration-300 hover:scale-110 hover:rotate-3">
              <span className="text-white font-bold text-3xl">🚀</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Join FoodFlow
              </span>
            </h1>
            <p className="text-xl text-gray-300 font-medium">
              Start your journey with us
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center space-x-4 mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  currentStep >= step 
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg' 
                    : 'bg-white/20 text-gray-400'
                }`}>
                  {currentStep > step ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                    currentStep > step ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-white/20'
                  }`}></div>
                )}
              </div>
            ))}
          </div>

          {/* Registration Form */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6">
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-all duration-300"
                  >
                    ← Previous
                  </button>
                )}
                
                <div className="flex-1"></div>
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all duration-300 shadow-lg transform hover:scale-105"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-blue-600 disabled:opacity-50 transition-all duration-300 shadow-lg transform hover:scale-105"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating Account...
                      </div>
                    ) : (
                      'Create Account 🎉'
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-white/20">
              <span className="text-gray-300">Already have an account? </span>
              <Link 
                to="/login" 
                className="font-bold text-orange-400 hover:text-orange-300 transition-colors duration-200 hover:underline"
              >
                Sign in here
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              &copy; 2024 FoodFlow. Revolutionizing food delivery operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 
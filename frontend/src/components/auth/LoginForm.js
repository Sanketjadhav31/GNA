const validateForm = () => {
  const newErrors = {};

  // Email validation
  if (!formData.email) {
    newErrors.email = 'Email is required';
  }

  // Password validation  
  if (!formData.password) {
    newErrors.password = 'Password is required';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}; 
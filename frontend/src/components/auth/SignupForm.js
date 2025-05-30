const validateForm = () => {
  const newErrors = {};

  // Name validation
  if (!formData.name && role === 'manager') {
    newErrors.name = 'Name is required for managers';
  }

  // Email validation
  if (!formData.email) {
    newErrors.email = 'Email is required';
  }

  // Password validation  
  if (!formData.password) {
    newErrors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    newErrors.password = 'Password must be at least 6 characters';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}; 
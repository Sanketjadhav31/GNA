import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Create the context
const ToastContext = createContext();

// Action types
const TOAST_ACTIONS = {
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  CLEAR_ALL_TOASTS: 'CLEAR_ALL_TOASTS'
};

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Initial state
const initialState = {
  toasts: []
};

// Reducer function
const toastReducer = (state, action) => {
  switch (action.type) {
    case TOAST_ACTIONS.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, action.payload]
      };

    case TOAST_ACTIONS.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload)
      };

    case TOAST_ACTIONS.CLEAR_ALL_TOASTS:
      return {
        ...state,
        toasts: []
      };

    default:
      return state;
  }
};

// ToastProvider component
export const ToastProvider = ({ children }) => {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  // Generate unique ID for toasts
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Remove toast function
  const removeToast = useCallback((id) => {
    dispatch({
      type: TOAST_ACTIONS.REMOVE_TOAST,
      payload: id
    });
  }, []);

  // Add toast function
  const addToast = useCallback((message, type = TOAST_TYPES.INFO, duration = 5000) => {
    const id = generateId();
    const toast = {
      id,
      message,
      type,
      timestamp: Date.now()
    };

    dispatch({
      type: TOAST_ACTIONS.ADD_TOAST,
      payload: toast
    });

    // Auto remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        dispatch({
          type: TOAST_ACTIONS.REMOVE_TOAST,
          payload: id
        });
      }, duration);
    }

    return id;
  }, []);

  // Clear all toasts
  const clearAllToasts = useCallback(() => {
    dispatch({
      type: TOAST_ACTIONS.CLEAR_ALL_TOASTS
    });
  }, []);

  // Convenience methods for different toast types
  const success = useCallback((message, duration) => {
    return addToast(message, TOAST_TYPES.SUCCESS, duration);
  }, [addToast]);

  const error = useCallback((message, duration = 7000) => {
    return addToast(message, TOAST_TYPES.ERROR, duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast(message, TOAST_TYPES.WARNING, duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast(message, TOAST_TYPES.INFO, duration);
  }, [addToast]);

  const value = {
    toasts: state.toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Container component
const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

// Individual Toast component
const Toast = ({ toast }) => {
  const { removeToast } = useToast();

  const getToastStyles = (type) => {
    const baseStyles = "toast transform transition-all duration-300 ease-in-out";
    
    switch (type) {
      case TOAST_TYPES.SUCCESS:
        return `${baseStyles} toast-success`;
      case TOAST_TYPES.ERROR:
        return `${baseStyles} toast-error`;
      case TOAST_TYPES.WARNING:
        return `${baseStyles} toast-warning`;
      case TOAST_TYPES.INFO:
        return `${baseStyles} toast-info`;
      default:
        return `${baseStyles} toast-info`;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case TOAST_TYPES.SUCCESS:
        return (
          <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case TOAST_TYPES.ERROR:
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case TOAST_TYPES.WARNING:
        return (
          <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case TOAST_TYPES.INFO:
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={getToastStyles(toast.type)}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon(toast.type)}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">
            {toast.message}
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => removeToast(toast.id)}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom hook to use toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext; 
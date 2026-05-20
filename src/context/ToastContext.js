import React, { createContext, useCallback, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', icon: 'checkmark-circle' });

  const showToast = useCallback((message, icon = 'checkmark-circle') => {
    setToast({ visible: true, message, icon });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toast.visible}
        message={toast.message}
        icon={toast.icon}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

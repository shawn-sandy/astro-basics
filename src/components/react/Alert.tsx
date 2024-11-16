import React from 'react';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ type, children }) => {
  return (
    <div className={`alert alert-${type} `} role="alert">
      {children}
    </div>
  );
};

export default Alert;
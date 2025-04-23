import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// Replace this with actual authentication logic, such as checking a token or context
const isAuthenticated = () => {
  // Example: Check for a token in localStorage or sessionStorage
  return localStorage.getItem('authToken') !== null; 
};

const PrivateRoute: React.FC = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/" />;
};

export default PrivateRoute;

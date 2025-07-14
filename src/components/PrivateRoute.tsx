import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const PrivateRoute: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/check-auth`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
        }
      } catch (err) {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>;
  return authenticated ? <Outlet /> : <Navigate to="/signin" />;
};

export default PrivateRoute;

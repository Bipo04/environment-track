import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';

export const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      // Redirect to login page
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // If authenticated, render the protected content
  if (!authService.isAuthenticated()) {
    return null; // Or a loading spinner
  }

  return children;
};

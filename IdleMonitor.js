import React from 'react';
import { useNavigate } from 'react-router-dom';
import useIdleTimer from '../hooks/useIdleTimer';

const IdleMonitor = () => {
  const navigate = useNavigate();

  const handleIdleLogout = async () => {
    try {
      // Call the backend logout endpoint to revoke tokens/cookies
      // Note: If CSRF protection is enabled, ensure the CSRF token header is included here.
      await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error during auto-logout:', error);
    } finally {
      navigate('/login');
    }
  };

  // 15 minutes = 15 * 60 * 1000 = 900000 ms
  useIdleTimer(handleIdleLogout, 900000);

  return null;
};

export default IdleMonitor;
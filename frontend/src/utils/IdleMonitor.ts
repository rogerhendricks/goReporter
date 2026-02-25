import { useNavigate } from 'react-router-dom';
import useIdleTimer from '@/hooks/useIdleTimer';
import { useAuthStore } from '@/stores/authStore';

export function IdleMonitor() {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();

  const handleIdleLogout = async () => {
    if (!isAuthenticated) return;

    try {
      await logout();
    } catch (error) {
      console.error('Error during auto-logout:', error);
    } finally {
      navigate('/login');
    }
  };

  // Get timeout from env or default to 15 minutes (900000 ms)
  const envTimeout = Number(import.meta.env.VITE_IDLE_TIMEOUT);
  const timeoutMs = isNaN(envTimeout) || envTimeout <= 0 ? 900000 : envTimeout;

  useIdleTimer(handleIdleLogout, timeoutMs);

  return null;
}
import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that triggers an action after a specified period of inactivity.
 * @param {Function} action - The function to call when the timer expires.
 * @param {number} timeoutMs - The idle duration in milliseconds (default: 15 mins).
 */
const useIdleTimer = (action, timeoutMs = 900000) => {
  const timerRef = useRef(null);
  const actionRef = useRef(action);

  // Keep the action ref current to avoid re-binding the effect if the function identity changes
  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (actionRef.current) {
        actionRef.current();
      }
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    
    let lastRun = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRun > 1000) { // Throttle resets to once per second
        resetTimer();
        lastRun = now;
      }
    };

    events.forEach((event) => window.addEventListener(event, handleUserActivity));
    resetTimer(); // Start the timer immediately on mount

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
    };
  }, [resetTimer]);
};

export default useIdleTimer;
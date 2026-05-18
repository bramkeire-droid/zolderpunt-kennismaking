import { useState, useRef, useCallback, useEffect } from 'react';

export function useCallTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    accumulatedRef.current = elapsed;
    setIsRunning(true);
  }, [elapsed]);

  const pause = useCallback(() => {
    accumulatedRef.current = elapsed;
    setIsRunning(false);
  }, [elapsed]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, start, pause]);

  const reset = useCallback(() => {
    setElapsed(0);
    setIsRunning(false);
    accumulatedRef.current = 0;
    startTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const formatted = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return { elapsed, formatted, isRunning, start, pause, toggle, reset };
}

export function startVisibleInterval(callback, delay) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let timer = null;
  let running = false;

  const invoke = () => {
    if (running || document.hidden) return;
    running = true;
    Promise.resolve(callback())
      .catch(() => {})
      .finally(() => {
        running = false;
      });
  };

  const stopTimer = () => {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  };

  const startTimer = () => {
    stopTimer();
    if (!document.hidden) timer = window.setInterval(invoke, delay);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      stopTimer();
      return;
    }
    invoke();
    startTimer();
  };

  startTimer();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    stopTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}


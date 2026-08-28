import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const STORAGE_KEY = 'sou-site-theme-v1';

function readTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.souTheme === 'dark' ? 'dark' : 'light';
}

export default function SiteThemeToggle() {
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const supported = router.pathname === '/' || router.pathname.startsWith('/jangjisu-prison');

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  if (!supported) return null;

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.souTheme = next;
    document.documentElement.style.colorScheme = next;
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
    setTheme(next);
  };

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={dark ? '라이트 모드' : '다크 모드'}
      className="sou-theme-toggle fixed bottom-5 right-5 z-[105] flex h-12 w-12 items-center justify-center rounded-full text-[21px] transition duration-200 hover:-translate-y-0.5 active:scale-95 sm:h-14 sm:w-14"
    >
      <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}


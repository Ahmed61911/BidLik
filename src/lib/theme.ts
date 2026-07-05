import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const STORAGE_KEY = "bidlik-theme";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/** Hook that exposes the current theme + a toggle. Persists to localStorage. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync with the value already applied by the inline boot script.
  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const update = (t: Theme) => {
    setTheme(t);
    applyTheme(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  return {
    theme,
    setTheme: update,
    toggle: () => update(theme === "dark" ? "light" : "dark"),
  };
}

/** Inline script string injected into <head> to avoid a flash of wrong theme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:'light';var r=document.documentElement;if(t==='dark')r.classList.add('dark');r.style.colorScheme=t;}catch(e){}})();`;

"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Moon } from "lucide-react";

type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "ai-omni-theme-mode";

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", nextTheme);
  document.documentElement.style.colorScheme = nextTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function readTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeModeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialTheme = readTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  if (!mounted) {
    return <div className="theme-mode-toggle-icon-placeholder" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className="theme-mode-toggle-icon"
      onClick={toggleTheme}
      aria-label={`切换显示模式 (当前: ${theme})`}
    >
      {theme === "dark" ? (
        <Lightbulb size={18} strokeWidth={2} />
      ) : (
        <Moon size={18} strokeWidth={2} />
      )}
    </button>
  );
}


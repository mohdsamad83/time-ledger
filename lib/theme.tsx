"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "dark" | "light" | "midnight" | "speedster";

export interface ThemeConfig {
  id: ThemeId;
  label: string;
  icon: string;
  description: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "dark",
    label: "Dark Gold",
    icon: "🌑",
    description: "Classic amber on obsidian",
  },
  {
    id: "speedster",
    label: "Built Different",
    icon: "🏎️",
    description: "Porsche mint, racing crimson & matte obsidian",
  },
  {
    id: "midnight",
    label: "Midnight",
    icon: "🌌",
    description: "Deep navy with sapphire",
  },
  {
    id: "light",
    label: "Parchment",
    icon: "☀️",
    description: "Warm light, ink & gold",
  },
];

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  setTheme: () => {},
  themeConfig: THEMES[0],
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tl-theme") as ThemeId | null;
    if (saved && THEMES.find((t) => t.id === saved)) {
      setThemeState(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("tl-theme", theme);
  }, [theme, mounted]);

  const setTheme = (t: ThemeId) => setThemeState(t);
  const themeConfig = THEMES.find((t) => t.id === theme)!;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

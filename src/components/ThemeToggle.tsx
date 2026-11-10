"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  // krátce zapneme plynulý přechod barev (jen na chvíli, ať nezpomaluje animace ve hře)
  html.classList.add("theme-switching");
  window.setTimeout(() => html.classList.remove("theme-switching"), 300);

  if (theme === "light") html.dataset.theme = "light";
  else delete html.dataset.theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // soukromé okno apod. — motiv jen nepřežije obnovení stránky
  }
}

/** Přepínač světlého a tmavého režimu v horní liště. Výchozí je tmavý (původní vzhled hry). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const next: Theme = theme === "light" ? "dark" : "light";
  const label = next === "light" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim";

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

/** obrysové ikony (barva podle textu tlačítka) */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

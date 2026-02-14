"use client";

import { useEffect } from "react";

export default function ThemeCookieInit() {
  useEffect(() => {
    try {
      // Prefer cookie, then localStorage, then system, then dark.
      const cookieMatch = document.cookie.match(/(?:^|;\s*)bb\.theme=([^;]+)/);
      const cookieTheme = cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : "";

      const stored = window.localStorage.getItem("bb.theme") || "";
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      const theme =
        cookieTheme === "light" || cookieTheme === "dark"
          ? cookieTheme
          : stored === "light" || stored === "dark"
          ? stored
          : prefersDark
          ? "dark"
          : "light";

      // Set cookie for SSR next requests if missing
      if (!cookieTheme) {
        document.cookie = `bb.theme=${encodeURIComponent(theme)}; path=/; max-age=31536000; samesite=lax`;
      }

      // Sync localStorage (best-effort)
      try {
        window.localStorage.setItem("bb.theme", theme);
      } catch {
        // ignore
      }

      // Apply class immediately (no flash)
      const root = document.documentElement;
      if (theme === "dark") root.classList.add("theme-dark");
      else root.classList.remove("theme-dark");
    } catch {
      // ignore
    }
  }, []);

  return null;
}
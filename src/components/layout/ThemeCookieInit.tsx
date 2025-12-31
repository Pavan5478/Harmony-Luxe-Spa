"use client";

import { useEffect } from "react";

export default function ThemeCookieInit() {
  useEffect(() => {
    try {
      // If cookie already exists, no need to do anything
      if (document.cookie.includes("bb.theme=")) return;

      // Read localStorage if available, else default = dark
      const stored = window.localStorage.getItem("bb.theme");
      const theme = stored === "light" ? "light" : "dark";

      // Set cookie for SSR next requests
      document.cookie = `bb.theme=${theme}; path=/; max-age=31536000; samesite=lax`;

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
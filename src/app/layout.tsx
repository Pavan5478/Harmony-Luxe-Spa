// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Bill Book Admin",
  description: "Billing suite",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("bb.theme")?.value;

  // default = dark
  const isDark = themeCookie !== "light";

  return (
    <html
      lang="en"
      className={`h-full ${isDark ? "theme-dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="h-full min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
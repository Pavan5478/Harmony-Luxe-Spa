import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Bill Book Admin",
  description: "Billing suite",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("bb.theme")?.value;
  const isDark = themeCookie !== "light";

  return (
    <html
      lang="en"
      className={isDark ? "theme-dark" : ""}
      suppressHydrationWarning
    >
      <body className="min-h-screen text-foreground antialiased">{children}</body>
    </html>
  );
}
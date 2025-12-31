﻿// src/app/(app)/layout.tsx
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ThemeCookieInit from "@/components/layout/ThemeCookieInit";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  return (
    <div className="app-shell">
      {/* ✅ Auto-init theme cookie on first load (client) */}
      <ThemeCookieInit />

      {/* Fixed sidebar (desktop) */}
      <Sidebar />

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <Topbar />
        <main className="app-main">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
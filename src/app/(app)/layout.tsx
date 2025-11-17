// src/app/(app)/layout.tsx
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-3 pb-6 pt-4 sm:px-4 lg:px-0">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
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
    <div className="min-h-screen w-full overflow-x-clip">
      <ThemeCookieInit />
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full ">{children}</div>
        </main>
      </div>
    </div>
  );
}
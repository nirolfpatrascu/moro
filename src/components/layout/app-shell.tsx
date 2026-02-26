"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 min-h-screen bg-[#FFF8F0]">
        <Header />
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  );
}

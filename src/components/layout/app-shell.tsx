"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoginPage && status === "unauthenticated") {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(pathname)}`;
    }
  }, [status, isLoginPage, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C4A882] border-t-[#6F4E37]" />
          <span className="text-sm text-[#6B5B4F]">Se încarcă...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="flex-1 min-h-screen bg-[#FFF8F0]"
        style={{ marginLeft: "16rem" }}
      >
        <Header />
        <div className="px-6 py-8 sm:px-8 md:px-10 lg:px-12">{children}</div>
      </main>
    </div>
  );
}

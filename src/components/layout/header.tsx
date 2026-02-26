"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import { SearchCommand } from "./search-command";
import Link from "next/link";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/income": "Incasari Zilnice",
  "/incoming": "Intrare Facturi",
  "/outgoing": "Iesire Facturi",
  "/import": "Import Excel",
  "/dashboard/pnl": "Profit & Loss",
  "/dashboard/cashflow": "Cash Flow",
  "/dashboard/cogs": "COGS",
  "/suppliers": "Furnizori",
  "/customers": "Clienti",
  "/locations": "Locatii",
  "/settings": "Setari",
};

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const title = pageTitles[pathname] ?? "Moro";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[#E8DDD0] bg-white/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3 pl-12 lg:pl-0">
        {/* Spacer to balance the right side */}
      </div>
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
        <h1 className="text-lg font-bold text-[#2D1B0E]">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <SearchCommand />
        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9B8B7F] transition-colors hover:bg-[#FFF3E6] hover:text-[#6F4E37]"
        >
          <Settings className="h-4 w-4" />
        </Link>
        {session?.user && (
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || ""}
                className="h-7 w-7 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6F4E37] text-xs font-medium text-white">
                {(session.user.name || session.user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9B8B7F] transition-colors hover:bg-[#FFEBEE] hover:text-[#F44336]"
              title="Deconecteaza-te"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

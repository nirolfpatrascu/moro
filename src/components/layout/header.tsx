"use client";

import { usePathname } from "next/navigation";
import { Coffee } from "lucide-react";

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
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Moro";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-sm lg:px-8">
      <div className="flex items-center gap-3 pl-12 lg:pl-0">
        <h1 className="text-lg font-semibold text-text">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5">
          <Coffee className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">MG + O</span>
        </div>
      </div>
    </header>
  );
}

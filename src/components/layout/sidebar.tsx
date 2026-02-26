"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  FileInput,
  FileOutput,
  TrendingUp,
  Wallet,
  BarChart3,
  Truck,
  Users,
  MapPin,
  Menu,
  X,
  Coffee,
  Upload,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Incasari Zilnice", href: "/income", icon: Receipt },
  { label: "Intrare Facturi", href: "/incoming", icon: FileInput },
  { label: "Iesire Facturi", href: "/outgoing", icon: FileOutput },
  { label: "Import Excel", href: "/import", icon: Upload },
  { type: "separator" as const, label: "Rapoarte" },
  { label: "P&L", href: "/dashboard/pnl", icon: TrendingUp },
  { label: "Cash Flow", href: "/dashboard/cashflow", icon: Wallet },
  { label: "COGS", href: "/dashboard/cogs", icon: BarChart3 },
  { type: "separator" as const, label: "Referinte" },
  { label: "Furnizori", href: "/suppliers", icon: Truck },
  { label: "Clienti", href: "/customers", icon: Users },
  { label: "Locatii", href: "/locations", icon: MapPin },
  { type: "separator" as const, label: "" },
  { label: "Setari", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-white p-2 shadow-md lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5 text-[#2D1B0E]" /> : <Menu className="h-5 w-5 text-[#2D1B0E]" />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#6F4E37] transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-5">
          <Coffee className="h-6 w-6 text-white" />
          <span className="text-lg font-bold text-white">Moro</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item, i) => {
              if ("type" in item && item.type === "separator") {
                return (
                  <li key={i} className="mt-4 mb-1.5 px-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      {item.label}
                    </span>
                  </li>
                );
              }

              if (!("href" in item) || !item.href) return null;
              const Icon = item.icon!;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-[11px] text-white/40">Moro Coffee Manager</p>
          <p className="text-[10px] text-white/30">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}

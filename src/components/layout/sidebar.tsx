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
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-surface p-2 shadow-md lg:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5 text-text" /> : <Menu className="h-5 w-5 text-text" />}
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
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <Coffee className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">Moro</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item, i) => {
              if ("type" in item && item.type === "separator") {
                return (
                  <li key={i} className="mt-4 mb-2 px-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
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
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <p className="text-xs text-text-muted">Moro Coffee Manager</p>
          <p className="text-[10px] text-text-muted">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}

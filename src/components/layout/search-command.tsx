"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileInput, FileOutput, Receipt, Truck, Users, X } from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

interface SearchResults {
  incomingInvoices: SearchResult[];
  outgoingInvoices: SearchResult[];
  receipts: SearchResult[];
  suppliers: SearchResult[];
  customers: SearchResult[];
}

const SECTION_CONFIG = [
  { key: "incomingInvoices" as const, label: "Facturi intrare", icon: FileInput },
  { key: "outgoingInvoices" as const, label: "Facturi iesire", icon: FileOutput },
  { key: "receipts" as const, label: "Incasari", icon: Receipt },
  { key: "suppliers" as const, label: "Furnizori", icon: Truck },
  { key: "customers" as const, label: "Clienti", icon: Users },
];

export function SearchCommand() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || null);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults = results && SECTION_CONFIG.some((s) => results[s.key].length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9B8B7F]" />
        <input
          ref={inputRef}
          type="text"
          placeholder=""
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-8 w-52 rounded-lg border border-gray-200 bg-[#FFF8F0] pl-3 pr-8 text-xs text-right text-[#2D1B0E] placeholder:text-right placeholder:text-[#9B8B7F] focus:outline-none focus:ring-2 focus:ring-[#6F4E37]/30"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9B8B7F] hover:text-[#2D1B0E]"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {loading ? (
            <div className="px-4 py-6 text-center text-xs text-[#9B8B7F]">
              Se cauta...
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-xs text-[#9B8B7F]">
              Niciun rezultat pentru &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {SECTION_CONFIG.map(({ key, label, icon: Icon }) => {
                const items = results![key];
                if (items.length === 0) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 bg-gray-50/50 px-3 py-1.5">
                      <Icon className="h-3 w-3 text-[#9B8B7F]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9B8B7F]">
                        {label}
                      </span>
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.href)}
                        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-[#FFF8F0]"
                      >
                        <span className="text-sm text-[#2D1B0E]">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-xs text-[#9B8B7F]">{item.sublabel}</span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

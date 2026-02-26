"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
  Modal,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Truck,
  FileInput,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { SupplierFormModal } from "@/components/suppliers/supplier-form";
import { exportToCSV } from "@/lib/export";

interface SupplierRow {
  id: string;
  name: string;
  _count: { invoices: number };
  totalSpend: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);

  const { toast } = useToast();

  // ── Debounced search ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Fetch suppliers ─────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      const supplierList: { id: string; name: string }[] = Array.isArray(data) ? data : data.data || [];

      // Fetch incoming invoices to compute counts and total spend per supplier
      const invoicesRes = await fetch("/api/incoming-invoices?pageSize=500");
      const invoicesData = await invoicesRes.json();
      const invoiceRows = invoicesData.data || [];

      const countMap: Record<string, number> = {};
      const spendMap: Record<string, number> = {};
      for (const inv of invoiceRows) {
        countMap[inv.supplierId] = (countMap[inv.supplierId] || 0) + 1;
        spendMap[inv.supplierId] = (spendMap[inv.supplierId] || 0) + (inv.totalAmount || 0);
      }

      const enriched: SupplierRow[] = supplierList.map((s) => ({
        ...s,
        _count: { invoices: countMap[s.id] || 0 },
        totalSpend: spendMap[s.id] || 0,
      }));

      setSuppliers(enriched);
    } catch {
      toast({ title: "Eroare la incarcarea furnizorilor", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Filter locally by search
  const filtered = search
    ? suppliers.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      )
    : suppliers;

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/suppliers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Furnizor sters", variant: "success" });
        fetchSuppliers();
      } else {
        toast({ title: data.error || "Eroare la stergere", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la stergere", variant: "danger" });
    }
    setDeleteTarget(null);
  };

  // ── After form submit ───────────────────────────────────
  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  // ── Export ──────────────────────────────────────────────
  const handleExport = () => {
    exportToCSV(filtered, "furnizori", [
      { header: "Nume", accessor: (s) => s.name },
      { header: "Nr. facturi", accessor: (s) => s._count.invoices },
      { header: "Total cheltuieli", accessor: (s) => s.totalSpend },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Furnizori</h2>
          <p className="mt-1 text-sm text-text-muted">
            {suppliers.length} furnizori
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingSupplier(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adauga furnizor
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cauta furnizori..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Nume furnizor</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Nr. facturi</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Total cheltuieli</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-border-light" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <Truck className="mx-auto mb-3 h-12 w-12 text-border" />
                    <p className="text-text-muted">
                      {search ? "Niciun furnizor gasit" : "Nu exista furnizori"}
                    </p>
                    {!search && (
                      <p className="mt-1 text-xs text-text-muted">
                        Adauga un furnizor pentru a incepe
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {supplier.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-text">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-text-secondary">
                        <FileInput className="h-3.5 w-3.5" />
                        {supplier._count.invoices}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-text">
                      {formatCurrency(supplier.totalSpend)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingSupplier({ id: supplier.id, name: supplier.name });
                            setFormOpen(true);
                          }}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-primary"
                          title="Editeaza"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(supplier)}
                          className="rounded p-1.5 text-text-muted hover:bg-danger-light hover:text-danger"
                          title="Sterge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Form Modal */}
      <SupplierFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingSupplier(null);
        }}
        supplier={editingSupplier}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge furnizor"
        description={`Esti sigur ca vrei sa stergi furnizorul "${deleteTarget?.name}"?`}
      >
        <div className="space-y-4">
          {deleteTarget && deleteTarget._count.invoices > 0 && (
            <div className="rounded-lg border border-warning bg-warning/10 p-3">
              <p className="text-sm text-warning">
                Atentie: Furnizorul are {deleteTarget._count.invoices} facturi asociate.
                Sterge mai intai facturile.
              </p>
            </div>
          )}
          <p className="text-sm text-text-secondary">
            Aceasta actiune nu poate fi anulata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuleaza
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Sterge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

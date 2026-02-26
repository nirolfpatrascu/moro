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
  Users,
  FileOutput,
} from "lucide-react";
import { CustomerFormModal } from "@/components/customers/customer-form";

interface CustomerRow {
  id: string;
  name: string;
  _count: { invoices: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);

  const { toast } = useToast();

  // ── Debounced search ────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Fetch customers ─────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();

      // The basic customers API returns [{id, name}], we need invoice counts too.
      // Fetch with counts by getting all outgoing invoices grouped.
      const invoicesRes = await fetch("/api/outgoing-invoices?pageSize=1");
      const invoicesData = await invoicesRes.json();

      // Get all customers with their invoice counts
      const customerList: { id: string; name: string }[] = Array.isArray(data) ? data : data.data || [];

      // Count invoices per customer from a separate call
      const countRes = await fetch("/api/outgoing-invoices?pageSize=100");
      const countData = await countRes.json();
      const invoiceRows = countData.data || [];
      const countMap: Record<string, number> = {};
      for (const inv of invoiceRows) {
        countMap[inv.customerId] = (countMap[inv.customerId] || 0) + 1;
      }

      const enriched: CustomerRow[] = customerList.map((c) => ({
        ...c,
        _count: { invoices: countMap[c.id] || 0 },
      }));

      setCustomers(enriched);
    } catch {
      toast({ title: "Eroare la incarcarea clientilor", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter locally by search
  const filtered = search
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/customers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Client sters", variant: "success" });
        fetchCustomers();
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
    setEditingCustomer(null);
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Clienti</h2>
          <p className="mt-1 text-sm text-text-muted">
            {customers.length} clienti
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingCustomer(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Adauga client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cauta clienti..."
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
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Nume client</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Nr. facturi</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-border-light" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <Users className="mx-auto mb-3 h-12 w-12 text-border" />
                    <p className="text-text-muted">
                      {search ? "Niciun client gasit" : "Nu exista clienti"}
                    </p>
                    {!search && (
                      <p className="mt-1 text-xs text-text-muted">
                        Adauga un client pentru a incepe
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-text">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-text-secondary">
                        <FileOutput className="h-3.5 w-3.5" />
                        {customer._count.invoices}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingCustomer({ id: customer.id, name: customer.name });
                            setFormOpen(true);
                          }}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-primary"
                          title="Editeaza"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(customer)}
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
      <CustomerFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge client"
        description={`Esti sigur ca vrei sa stergi clientul "${deleteTarget?.name}"?`}
      >
        <div className="space-y-4">
          {deleteTarget && deleteTarget._count.invoices > 0 && (
            <div className="rounded-lg border border-warning bg-warning/10 p-3">
              <p className="text-sm text-warning">
                Atentie: Clientul are {deleteTarget._count.invoices} facturi asociate.
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

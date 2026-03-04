"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, Button, Badge, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Download,
  FileOutput,
  X,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { OutgoingInvoiceFormModal } from "@/components/outgoing/invoice-form";
import { OutgoingInvoiceDetailModal } from "@/components/outgoing/invoice-detail";
import { exportToCSV } from "@/lib/export";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useSelection } from "@/hooks/use-selection";
import {
  useOutgoingInvoices,
  useDeleteOutgoingInvoice,
  useMarkOutgoingPaid,
  useBulkMarkOutgoingPaid,
} from "@/hooks/queries/use-outgoing-invoices";
import { useCustomers } from "@/hooks/queries/use-customers";
import { DataTable, type Column } from "@/components/shared/data-table";

// ── Types ─────────────────────────────────────────────────
interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issueDate: string | null;
  dueDate: string | null;
  totalAmount: number;
  amountExVat: number;
  paidAmount: number;
  unpaidAmount: number;
  status: string;
  notes: string | null;
  year: number;
  month: string;
  paymentYear: number | null;
  paymentMonth: string | null;
  paymentDay: number | null;
  customer: { id: string; name: string };
}

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "danger" | "warning" }> =
  {
    PAID: { label: "Platita", variant: "success" },
    UNPAID: { label: "Neplatita", variant: "danger" },
    PARTIAL: { label: "Partial", variant: "warning" },
  };

export default function OutgoingInvoicesPage() {
  // ── Shared hooks ────────────────────────────────────────
  const { page, setPage, pageSize, sortBy, sortDir, toggleSort } = usePaginatedList({
    initialSortBy: "createdAt",
    initialSortDir: "desc",
  });
  const { selected, toggle, toggleAll, clear, count: selectedCount } = useSelection();
  const { toast } = useToast();

  // ── Filter / search state ──────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Modal state ────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);

  // ── Debounced search (400ms) ───────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // ── React Query data ──────────────────────────────────
  const { data, isLoading } = useOutgoingInvoices({
    page,
    pageSize,
    sortBy,
    sortDir,
    search,
    customerId: filterCustomer || undefined,
    status: filterStatus || undefined,
    year: filterYear || undefined,
  });
  const invoices: InvoiceRow[] = data?.data ?? [];
  const pagination = data?.pagination;

  const { data: customers = [] } = useCustomers();

  // ── Mutations ─────────────────────────────────────────
  const deleteMutation = useDeleteOutgoingInvoice();
  const markPaidMutation = useMarkOutgoingPaid();
  const bulkMarkPaidMutation = useBulkMarkOutgoingPaid();

  // Clear selection when data changes
  useEffect(() => {
    clear();
  }, [data, clear]);

  // ── Handlers ──────────────────────────────────────────
  const handleMarkPaid = (inv: InvoiceRow) => {
    markPaidMutation.mutate(inv.id, {
      onSuccess: () =>
        toast({ title: `Factura ${inv.invoiceNumber} marcata ca platita`, variant: "success" }),
      onError: () => toast({ title: "Eroare", variant: "danger" }),
    });
  };

  const handleBulkMarkPaid = () => {
    if (selectedCount === 0) return;
    bulkMarkPaidMutation.mutate(Array.from(selected), {
      onSuccess: () => {
        toast({ title: `${selectedCount} facturi marcate ca platite`, variant: "success" });
        clear();
      },
      onError: () => toast({ title: "Eroare la actualizare", variant: "danger" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => toast({ title: "Factura stearsa", variant: "success" }),
      onError: () => toast({ title: "Eroare la stergere", variant: "danger" }),
      onSettled: () => setDeleteTarget(null),
    });
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingInvoice(null);
  };

  // ── Year options ──────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // ── Columns ───────────────────────────────────────────
  const columns = useMemo<Column<InvoiceRow>[]>(
    () => [
      {
        key: "invoiceNumber",
        label: "Nr. Factura",
        sortable: true,
        render: (inv) => <span className="font-medium text-text">{inv.invoiceNumber}</span>,
      },
      {
        key: "customer",
        label: "Client",
        render: (inv) => <span className="text-text-secondary">{inv.customer.name}</span>,
      },
      {
        key: "issueDate",
        label: "Data",
        sortable: true,
        render: (inv) => (
          <span className="text-text-secondary">
            {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("ro-RO") : "-"}
          </span>
        ),
      },
      {
        key: "totalAmount",
        label: "Total",
        sortable: true,
        className: "text-right",
        render: (inv) => (
          <span className="font-medium text-text">{formatCurrency(inv.totalAmount)}</span>
        ),
      },
      {
        key: "unpaidAmount",
        label: "Neachitat",
        className: "text-right",
        render: (inv) => (
          <span className="text-text-secondary">
            {inv.unpaidAmount > 0 ? formatCurrency(inv.unpaidAmount) : "-"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        className: "text-center",
        render: (inv) => {
          const s = STATUS_LABELS[inv.status] || STATUS_LABELS.UNPAID;
          return <Badge variant={s.variant}>{s.label}</Badge>;
        },
      },
      {
        key: "actions",
        label: "Actiuni",
        className: "text-right",
        render: (inv) => (
          <div className="flex items-center justify-end gap-1">
            {inv.status !== "PAID" && (
              <button
                onClick={() => handleMarkPaid(inv)}
                className="rounded p-1.5 text-text-muted hover:bg-success-light hover:text-success"
                title="Marcheaza ca platita"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setDetailInvoice(inv)}
              className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
              title="Detalii"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditingInvoice(inv);
                setFormOpen(true);
              }}
              className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-primary"
              title="Editeaza"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteTarget(inv)}
              className="rounded p-1.5 text-text-muted hover:bg-danger-light hover:text-danger"
              title="Sterge"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Iesire Facturi</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            {pagination?.total ?? 0} facturi emise catre clienti
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(invoices, "facturi-iesire", [
                { header: "Nr. Factura", accessor: (i) => i.invoiceNumber },
                { header: "Client", accessor: (i) => i.customer.name },
                {
                  header: "Data emitere",
                  accessor: (i) =>
                    i.issueDate ? new Date(i.issueDate).toLocaleDateString("ro-RO") : "",
                },
                { header: "Total fara TVA", accessor: (i) => i.amountExVat },
                { header: "Total", accessor: (i) => i.totalAmount },
                { header: "Platit", accessor: (i) => i.paidAmount },
                { header: "Neachitat", accessor: (i) => i.unpaidAmount },
                { header: "Status", accessor: (i) => i.status },
              ])
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingInvoice(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adauga factura
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">
                {selectedCount} factur{selectedCount === 1 ? "a selectata" : "i selectate"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkMarkPaid}
                  loading={bulkMarkPaidMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Marcheaza ca platite
                </Button>
                <Button variant="ghost" size="sm" onClick={clear}>
                  Anuleaza selectia
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder=""
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface pl-3 pr-10 text-sm text-right text-text placeholder:text-right placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtre
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <select
                value={filterCustomer}
                onChange={(e) => {
                  setFilterCustomer(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toti clientii</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toate statusurile</option>
                <option value="PAID">Platite</option>
                <option value="UNPAID">Neplatite</option>
                <option value="PARTIAL">Partial platite</option>
              </select>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toti anii</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {(filterCustomer || filterStatus || filterYear) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCustomer("");
                    setFilterStatus("");
                    setFilterYear("");
                  }}
                >
                  <X className="h-4 w-4" />
                  Sterge filtre
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable<InvoiceRow>
        columns={columns}
        data={invoices}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        selected={selected}
        onToggleOne={toggle}
        onToggleAll={() => toggleAll(invoices.map((i) => i.id))}
        emptyIcon={<FileOutput className="mx-auto h-12 w-12 text-border" />}
        emptyText="Nu exista facturi"
        emptySubtext="Adauga o factura de iesire"
      />

      {/* Create/Edit Form Modal */}
      <OutgoingInvoiceFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <OutgoingInvoiceDetailModal
        invoice={detailInvoice}
        onClose={() => setDetailInvoice(null)}
        onMarkPaid={(inv) => {
          handleMarkPaid(inv);
          setDetailInvoice(null);
        }}
        onEdit={(inv) => {
          setDetailInvoice(null);
          setEditingInvoice(inv);
          setFormOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge factura"
        description={`Esti sigur ca vrei sa stergi factura ${deleteTarget?.invoiceNumber}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Aceasta actiune nu poate fi anulata.</p>
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

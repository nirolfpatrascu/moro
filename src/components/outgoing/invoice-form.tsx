"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { VAT_MULTIPLIER } from "@/lib/constants";
import { Loader2, Plus } from "lucide-react";

interface InvoiceData {
  id?: string;
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
  customer?: { id: string; name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onSuccess: () => void;
}

interface FormState {
  invoiceNumber: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
  amountExVat: string;
  paidAmount: string;
  status: string;
  notes: string;
}

const emptyForm: FormState = {
  invoiceNumber: "",
  customerId: "",
  issueDate: "",
  dueDate: "",
  totalAmount: "0",
  amountExVat: "0",
  paidAmount: "0",
  status: "UNPAID",
  notes: "",
};

export function OutgoingInvoiceFormModal({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCustomerName, setNewCustomerName] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const { toast } = useToast();

  const isEdit = !!invoice?.id;

  // Load customers
  const loadCustomers = () => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data);
        else if (data.data) setCustomers(data.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (invoice) {
      setForm({
        invoiceNumber: invoice.invoiceNumber || "",
        customerId: invoice.customerId || invoice.customer?.id || "",
        issueDate: invoice.issueDate ? String(invoice.issueDate).split("T")[0] : "",
        dueDate: invoice.dueDate ? String(invoice.dueDate).split("T")[0] : "",
        totalAmount: String(invoice.totalAmount || 0),
        amountExVat: String(invoice.amountExVat || 0),
        paidAmount: String(invoice.paidAmount || 0),
        status: invoice.status || "UNPAID",
        notes: invoice.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setShowNewCustomer(false);
    setNewCustomerName("");
  }, [invoice, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  // Auto-calculate exVat when total changes
  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const total = parseFloat(e.target.value) || 0;
    const exVat = +(total / VAT_MULTIPLIER).toFixed(2);
    setForm((f) => ({
      ...f,
      totalAmount: e.target.value,
      amountExVat: String(exVat),
    }));
    setErrors((prev) => ({ ...prev, totalAmount: "" }));
  };

  // Auto-calculate unpaid when paidAmount changes
  const unpaidAmount = Math.max(0, (parseFloat(form.totalAmount) || 0) - (parseFloat(form.paidAmount) || 0));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.invoiceNumber.trim()) errs.invoiceNumber = "Obligatoriu";
    if (!form.customerId) errs.customerId = "Obligatoriu";
    if (!form.totalAmount || parseFloat(form.totalAmount) <= 0) {
      errs.totalAmount = "Trebuie sa fie > 0";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Create new customer inline
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    setCreatingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomerName.trim() }),
      });
      const data = await res.json();
      if (res.ok || data.id) {
        loadCustomers();
        setForm((f) => ({ ...f, customerId: data.id }));
        setShowNewCustomer(false);
        setNewCustomerName("");
        toast({ title: "Client adaugat", variant: "success" });
      } else {
        toast({ title: data.error || "Eroare", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la crearea clientului", variant: "danger" });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        invoiceNumber: form.invoiceNumber.trim(),
        customerId: form.customerId,
        issueDate: form.issueDate || null,
        dueDate: form.dueDate || null,
        totalAmount: parseFloat(form.totalAmount) || 0,
        amountExVat: parseFloat(form.amountExVat) || 0,
        paidAmount: parseFloat(form.paidAmount) || 0,
        unpaidAmount,
        status: form.status,
        notes: form.notes || null,
      };

      const url = isEdit
        ? `/api/outgoing-invoices/${invoice!.id}`
        : "/api/outgoing-invoices";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Eroare",
          description: data.error || "Eroare la salvare",
          variant: "danger",
        });
        return;
      }

      toast({
        title: isEdit ? "Factura actualizata" : "Factura creata",
        variant: "success",
      });
      onSuccess();
    } catch {
      toast({ title: "Eroare la salvare", variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editeaza factura" : "Adauga factura noua"}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Basic info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            label="Nr. Factura *"
            value={form.invoiceNumber}
            onChange={handleChange}
            error={errors.invoiceNumber}
          />

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"
            >
              <option value="UNPAID">Neplatita</option>
              <option value="PAID">Platita</option>
              <option value="PARTIAL">Partial platita</option>
            </select>
          </div>
        </div>

        {/* Customer with create shortcut */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Client *
          </label>
          {!showNewCustomer ? (
            <div className="flex gap-2">
              <select
                name="customerId"
                value={form.customerId}
                onChange={handleChange}
                className={`h-10 flex-1 rounded-lg border bg-surface px-3 text-sm text-text ${
                  errors.customerId ? "border-danger" : "border-border"
                }`}
              >
                <option value="">Selecteaza clientul</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewCustomer(true)}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                Nou
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nume client nou..."
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCustomer();
                  }
                }}
                className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateCustomer}
                loading={creatingCustomer}
                className="shrink-0"
              >
                Adauga
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewCustomer(false);
                  setNewCustomerName("");
                }}
                className="shrink-0"
              >
                Anuleaza
              </Button>
            </div>
          )}
          {errors.customerId && (
            <p className="text-xs text-danger">{errors.customerId}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            label="Data Emitere"
            value={form.issueDate}
            onChange={handleChange}
          />
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            label="Scadenta"
            value={form.dueDate}
            onChange={handleChange}
          />
        </div>

        {/* Amounts */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            label="Total cu TVA (RON) *"
            value={form.totalAmount}
            onChange={handleTotalChange}
            error={errors.totalAmount}
            min="0"
            step="0.01"
          />
          <Input
            id="amountExVat"
            name="amountExVat"
            type="number"
            label="Suma fara TVA"
            value={form.amountExVat}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="paidAmount"
            name="paidAmount"
            type="number"
            label="Suma achitata (RON)"
            value={form.paidAmount}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Rest de plata
            </label>
            <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-text">
              {unpaidAmount.toLocaleString("ro-RO")} RON
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Observatii
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anuleaza
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              "Salveaza"
            ) : (
              "Adauga"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

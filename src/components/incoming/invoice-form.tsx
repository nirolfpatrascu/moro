"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface InvoiceData {
  id?: string;
  invoiceNumber: string;
  supplierId: string;
  locationId: string;
  issueDate: string | null;
  dueDate: string | null;
  itemDescription: string | null;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  notes: string | null;
  supplier?: { id: string; name: string };
  location?: { id: string; code: string; name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null; // null = create, object = edit
  locations: { id: string; code: string; name: string }[];
  onSuccess: () => void;
}

interface FormState {
  invoiceNumber: string;
  supplierId: string;
  locationId: string;
  issueDate: string;
  dueDate: string;
  itemDescription: string;
  qty: string;
  unitPrice: string;
  totalAmount: string;
  status: string;
  notes: string;
}

const emptyForm: FormState = {
  invoiceNumber: "",
  supplierId: "",
  locationId: "",
  issueDate: "",
  dueDate: "",
  itemDescription: "",
  qty: "0",
  unitPrice: "0",
  totalAmount: "0",
  status: "UNPAID",
  notes: "",
};

export function InvoiceFormModal({
  open,
  onOpenChange,
  invoice,
  locations,
  onSuccess,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isEdit = !!invoice?.id;

  // Load suppliers
  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSuppliers(data);
        else if (data.data) setSuppliers(data.data);
      })
      .catch(() => {});
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (invoice) {
      setForm({
        invoiceNumber: invoice.invoiceNumber || "",
        supplierId: invoice.supplierId || invoice.supplier?.id || "",
        locationId: invoice.locationId || invoice.location?.id || "",
        issueDate: invoice.issueDate || "",
        dueDate: invoice.dueDate ? String(invoice.dueDate).split("T")[0] : "",
        itemDescription: invoice.itemDescription || "",
        qty: String(invoice.qty || 0),
        unitPrice: String(invoice.unitPrice || 0),
        totalAmount: String(invoice.totalAmount || 0),
        status: invoice.status || "UNPAID",
        notes: invoice.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [invoice, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: "" }));
  };

  // Auto-calculate total from qty * unitPrice
  useEffect(() => {
    const qty = parseFloat(form.qty) || 0;
    const unitPrice = parseFloat(form.unitPrice) || 0;
    if (qty > 0 && unitPrice > 0) {
      setForm((f) => ({ ...f, totalAmount: String((qty * unitPrice).toFixed(2)) }));
    }
  }, [form.qty, form.unitPrice]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.invoiceNumber.trim()) errs.invoiceNumber = "Obligatoriu";
    if (!form.supplierId) errs.supplierId = "Obligatoriu";
    if (!form.locationId) errs.locationId = "Obligatoriu";
    if (!form.totalAmount || parseFloat(form.totalAmount) <= 0) {
      errs.totalAmount = "Trebuie sa fie > 0";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        invoiceNumber: form.invoiceNumber.trim(),
        supplierId: form.supplierId,
        locationId: form.locationId,
        issueDate: form.issueDate || null,
        dueDate: form.dueDate || null,
        itemDescription: form.itemDescription || null,
        qty: parseFloat(form.qty) || 0,
        unitPrice: parseFloat(form.unitPrice) || 0,
        totalAmount: parseFloat(form.totalAmount) || 0,
        status: form.status,
        notes: form.notes || null,
      };

      const url = isEdit
        ? `/api/incoming-invoices/${invoice!.id}`
        : "/api/incoming-invoices";
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
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Invoice Number */}
          <Input
            id="invoiceNumber"
            name="invoiceNumber"
            label="Nr. Factura *"
            value={form.invoiceNumber}
            onChange={handleChange}
            error={errors.invoiceNumber}
          />

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Locatie *
            </label>
            <select
              name="locationId"
              value={form.locationId}
              onChange={handleChange}
              className={`h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text ${
                errors.locationId ? "border-danger" : "border-border"
              }`}
            >
              <option value="">Selecteaza locatia</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
            {errors.locationId && (
              <p className="text-xs text-danger">{errors.locationId}</p>
            )}
          </div>

          {/* Supplier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Furnizor *
            </label>
            <select
              name="supplierId"
              value={form.supplierId}
              onChange={handleChange}
              className={`h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text ${
                errors.supplierId ? "border-danger" : "border-border"
              }`}
            >
              <option value="">Selecteaza furnizorul</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="text-xs text-danger">{errors.supplierId}</p>
            )}
          </div>

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

          {/* Issue Date */}
          <Input
            id="issueDate"
            name="issueDate"
            label="Data Emitere"
            placeholder="DD/MM/YYYY"
            value={form.issueDate}
            onChange={handleChange}
          />

          {/* Due Date */}
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            label="Scadenta"
            value={form.dueDate}
            onChange={handleChange}
          />
        </div>

        {/* Item description */}
        <Input
          id="itemDescription"
          name="itemDescription"
          label="Descriere articol"
          value={form.itemDescription}
          onChange={handleChange}
        />

        {/* Amounts row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="qty"
            name="qty"
            type="number"
            label="Cantitate"
            value={form.qty}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
          <Input
            id="unitPrice"
            name="unitPrice"
            type="number"
            label="Pret unitar (RON)"
            value={form.unitPrice}
            onChange={handleChange}
            min="0"
            step="0.01"
          />
          <Input
            id="totalAmount"
            name="totalAmount"
            type="number"
            label="Total (RON) *"
            value={form.totalAmount}
            onChange={handleChange}
            error={errors.totalAmount}
            min="0"
            step="0.01"
          />
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
        <div className="flex justify-end gap-3 pt-2">
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

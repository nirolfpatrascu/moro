"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Loader2, Plus } from "lucide-react";
import { PL_CATEGORIES } from "@/lib/utils";

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
  amountExVat: number;
  vatAmount: number;
  status: string;
  notes: string | null;
  plCategory?: string;
  category?: string;
  subcategory?: string | null;
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
  amountExVat: string;
  vatAmount: string;
  status: string;
  notes: string;
  plCategory: string;
  category: string;
  subcategory: string;
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
  amountExVat: "0",
  vatAmount: "0",
  status: "UNPAID",
  notes: "",
  plCategory: "COGS",
  category: "",
  subcategory: "",
};

const CATEGORY_OPTIONS: Record<string, string[]> = {
  COGS: ["BAR", "BUCATARIE", "CONSUMABILE", "TRANSPORT", "LIVRARE", "DIVERSE"],
  COSTFIX: ["CHIRII", "UTILITATI", "BANCA", "DIVERSE"],
  OPEX: ["LICENTE", "CONSULTING", "CONTABILITATE", "AUTORIZATII", "MARKETING", "DIVERSE", "INVENTAR OBIECTE"],
  TAXE: ["IMPOZIT VENIT", "TVA", "ALTE TAXE"],
  PEOPLE: ["SALARII", "COLABORATORI", "TAXE SALARIU", "TICHETE MASA", "BONUSURI", "UNIFORME", "TRAINING"],
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
  const [newSupplierName, setNewSupplierName] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const { toast } = useToast();

  const isEdit = !!invoice?.id;

  // Load suppliers
  const loadSuppliers = () => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSuppliers(data);
        else if (data.data) setSuppliers(data.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSuppliers();
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
        amountExVat: String(invoice.amountExVat || 0),
        vatAmount: String(invoice.vatAmount || 0),
        status: invoice.status || "UNPAID",
        notes: invoice.notes || "",
        plCategory: invoice.plCategory || "COGS",
        category: invoice.category || "",
        subcategory: invoice.subcategory || "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setShowNewSupplier(false);
    setNewSupplierName("");
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
      const total = +(qty * unitPrice).toFixed(2);
      const exVat = +(total / 1.19).toFixed(2);
      const vat = +(total - exVat).toFixed(2);
      setForm((f) => ({
        ...f,
        totalAmount: String(total),
        amountExVat: String(exVat),
        vatAmount: String(vat),
      }));
    }
  }, [form.qty, form.unitPrice]);

  // Auto-calculate exVat/vat when total changes manually
  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const total = parseFloat(e.target.value) || 0;
    const exVat = +(total / 1.19).toFixed(2);
    const vat = +(total - exVat).toFixed(2);
    setForm((f) => ({
      ...f,
      totalAmount: e.target.value,
      amountExVat: String(exVat),
      vatAmount: String(vat),
    }));
    setErrors((prev) => ({ ...prev, totalAmount: "" }));
  };

  // Reset category when plCategory changes
  useEffect(() => {
    const options = CATEGORY_OPTIONS[form.plCategory] || [];
    if (!options.includes(form.category)) {
      setForm((f) => ({ ...f, category: options[0] || "", subcategory: "" }));
    }
  }, [form.plCategory, form.category]);

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

  // Create new supplier inline
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    setCreatingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      });
      const data = await res.json();
      if (res.ok || data.id) {
        loadSuppliers();
        setForm((f) => ({ ...f, supplierId: data.id }));
        setShowNewSupplier(false);
        setNewSupplierName("");
        toast({ title: "Furnizor adaugat", variant: "success" });
      } else {
        toast({ title: data.error || "Eroare", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la crearea furnizorului", variant: "danger" });
    } finally {
      setCreatingSupplier(false);
    }
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
        amountExVat: parseFloat(form.amountExVat) || 0,
        vatAmount: parseFloat(form.vatAmount) || 0,
        status: form.status,
        notes: form.notes || null,
        plCategory: form.plCategory,
        category: form.category || "GENERAL",
        subcategory: form.subcategory || null,
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

  const categoryOptions = CATEGORY_OPTIONS[form.plCategory] || [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editeaza factura" : "Adauga factura noua"}
      className="max-w-2xl"
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

          {/* Supplier with create shortcut */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-text-secondary">
              Furnizor *
            </label>
            {!showNewSupplier ? (
              <div className="flex gap-2">
                <select
                  name="supplierId"
                  value={form.supplierId}
                  onChange={handleChange}
                  className={`h-10 flex-1 rounded-lg border bg-surface px-3 text-sm text-text ${
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewSupplier(true)}
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
                  placeholder="Nume furnizor nou..."
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateSupplier();
                    }
                  }}
                  className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateSupplier}
                  loading={creatingSupplier}
                  className="shrink-0"
                >
                  Adauga
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewSupplier(false);
                    setNewSupplierName("");
                  }}
                  className="shrink-0"
                >
                  Anuleaza
                </Button>
              </div>
            )}
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

        {/* P&L Classification */}
        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Clasificare P&L
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Categorie P&L
              </label>
              <select
                name="plCategory"
                value={form.plCategory}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"
              >
                {PL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Categorie
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text"
              >
                <option value="">Selecteaza</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Input
              id="subcategory"
              name="subcategory"
              label="Subcategorie"
              placeholder="Optional"
              value={form.subcategory}
              onChange={handleChange}
            />
          </div>
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
            label="Total cu TVA (RON) *"
            value={form.totalAmount}
            onChange={handleTotalChange}
            error={errors.totalAmount}
            min="0"
            step="0.01"
          />
        </div>

        {/* Computed tax breakdown */}
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Input
            id="vatAmount"
            name="vatAmount"
            type="number"
            label="TVA"
            value={form.vatAmount}
            onChange={handleChange}
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

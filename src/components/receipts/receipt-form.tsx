"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Loader2, Zap } from "lucide-react";
import {
  RECEIPT_TYPES,
  PAYMENT_METHODS,
  RECEIPT_CATEGORIES,
} from "@/lib/validations/receipt";

interface ReceiptData {
  id?: string;
  locationId: string;
  date: string;
  type: string;
  description: string | null;
  category: string | null;
  amount: number;
  paymentMethod: string;
  receiptNumber: string | null;
  notes: string | null;
  location?: { id: string; code: string; name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptData | null;
  locations: { id: string; code: string; name: string }[];
  onSuccess: () => void;
  defaultLocationId?: string;
}

interface FormState {
  locationId: string;
  date: string;
  type: string;
  description: string;
  category: string;
  amount: string;
  paymentMethod: string;
  receiptNumber: string;
  notes: string;
}

export function ReceiptFormModal({
  open,
  onOpenChange,
  receipt,
  locations,
  onSuccess,
  defaultLocationId,
}: Props) {
  const [form, setForm] = useState<FormState>({
    locationId: defaultLocationId || "",
    date: new Date().toISOString().split("T")[0],
    type: "SALE",
    description: "",
    category: "",
    amount: "",
    paymentMethod: "CASH",
    receiptNumber: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quickMode, setQuickMode] = useState(false);
  const { toast } = useToast();

  const isEdit = !!receipt?.id;

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (receipt) {
      setForm({
        locationId: receipt.locationId || receipt.location?.id || "",
        date: receipt.date ? receipt.date.split("T")[0] : today,
        type: receipt.type || "SALE",
        description: receipt.description || "",
        category: receipt.category || "",
        amount: String(receipt.amount || ""),
        paymentMethod: receipt.paymentMethod || "CASH",
        receiptNumber: receipt.receiptNumber || "",
        notes: receipt.notes || "",
      });
      setQuickMode(false);
    } else {
      setForm({
        locationId: defaultLocationId || "",
        date: today,
        type: "SALE",
        description: "",
        category: "",
        amount: "",
        paymentMethod: "CASH",
        receiptNumber: "",
        notes: "",
      });
    }
    setErrors({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, open, defaultLocationId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.locationId) errs.locationId = "Obligatoriu";
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Suma trebuie sa fie > 0";
    if (!quickMode && !form.date) errs.date = "Obligatoriu";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        locationId: form.locationId,
        date: form.date || new Date().toISOString().split("T")[0],
        type: form.type,
        amount: parseFloat(form.amount) || 0,
        paymentMethod: form.paymentMethod,
        description: quickMode ? null : form.description || null,
        category: quickMode ? null : form.category || null,
        receiptNumber: quickMode ? null : form.receiptNumber || null,
        notes: quickMode ? null : form.notes || null,
      };

      const url = isEdit ? `/api/receipts/${receipt!.id}` : "/api/receipts";
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
        title: isEdit ? "Incasare actualizata" : "Incasare inregistrata",
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
      title={isEdit ? "Editeaza incasare" : "Inregistreaza incasare"}
      className="max-w-lg"
    >
      {/* Quick/Full mode toggle (only for new) */}
      {!isEdit && (
        <div className="mb-4 flex rounded-lg bg-background p-1">
          <button
            type="button"
            onClick={() => setQuickMode(false)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              !quickMode ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            Complet
          </button>
          <button
            type="button"
            onClick={() => setQuickMode(true)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
              quickMode ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Rapid
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payment method — large touch buttons */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-secondary">
            Metoda de plata
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentMethod: pm.value }))}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  form.paymentMethod === pm.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-secondary hover:border-primary/50"
                }`}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount — large input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            Suma (RON) *
          </label>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={`h-14 w-full rounded-lg border bg-surface px-4 text-2xl font-bold text-text placeholder:text-border focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              errors.amount ? "border-danger" : "border-border"
            }`}
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-danger">{errors.amount}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            Locatie *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {locations.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, locationId: l.id }));
                  setErrors((prev) => ({ ...prev, locationId: "" }));
                }}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  form.locationId === l.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-text-secondary hover:border-primary/50"
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
          {errors.locationId && (
            <p className="mt-1 text-xs text-danger">{errors.locationId}</p>
          )}
        </div>

        {/* Type selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            Tip
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RECEIPT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  form.type === t.value
                    ? t.variant === "success"
                      ? "border-success bg-success-light text-success"
                      : t.variant === "warning"
                        ? "border-warning bg-warning-light text-warning"
                        : "border-danger bg-danger-light text-danger"
                    : "border-border bg-surface text-text-secondary hover:border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extended fields (full mode only) */}
        {!quickMode && (
          <>
            <Input
              id="date"
              name="date"
              type="date"
              label="Data *"
              value={form.date}
              onChange={handleChange}
              error={errors.date}
            />

            <div className="grid gap-4 sm:grid-cols-2">
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
                  {RECEIPT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Input
                id="receiptNumber"
                name="receiptNumber"
                label="Nr. bon"
                value={form.receiptNumber}
                onChange={handleChange}
              />
            </div>

            <Input
              id="description"
              name="description"
              label="Descriere"
              value={form.description}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Observatii
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </>
        )}

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
            ) : quickMode ? (
              "Inregistreaza"
            ) : (
              "Adauga"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface DailyIncomeData {
  id?: string;
  locationId: string;
  date: string;
  totalSales: number;
  tva: number;
  salesExVat: number;
  receiptCount: number;
  avgReceipt: number;
  barSales: number;
  barProductCount: number;
  kitchenSales: number;
  kitchenProductCount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  accountAmount: number;
  deliveryAmount: number;
  tipsFiscal: number;
  tipsTotal: number;
  location?: { id: string; code: string; name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: DailyIncomeData | null;
  locations: { id: string; code: string; name: string }[];
  onSuccess: () => void;
  defaultLocationId?: string;
}

interface FormState {
  locationId: string;
  date: string;
  totalSales: string;
  tva: string;
  salesExVat: string;
  receiptCount: string;
  avgReceipt: string;
  barSales: string;
  barProductCount: string;
  kitchenSales: string;
  kitchenProductCount: string;
  cashAmount: string;
  cardAmount: string;
  transferAmount: string;
  accountAmount: string;
  deliveryAmount: string;
  tipsFiscal: string;
  tipsTotal: string;
}

const emptyForm = (defaultLocationId?: string): FormState => ({
  locationId: defaultLocationId || "",
  date: new Date().toISOString().split("T")[0],
  totalSales: "",
  tva: "",
  salesExVat: "",
  receiptCount: "",
  avgReceipt: "",
  barSales: "",
  barProductCount: "",
  kitchenSales: "",
  kitchenProductCount: "",
  cashAmount: "",
  cardAmount: "",
  transferAmount: "",
  accountAmount: "",
  deliveryAmount: "",
  tipsFiscal: "",
  tipsTotal: "",
});

export function DailyIncomeFormModal({
  open,
  onOpenChange,
  record,
  locations,
  onSuccess,
  defaultLocationId,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultLocationId));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const isEdit = !!record?.id;

  useEffect(() => {
    if (record) {
      setForm({
        locationId: record.locationId || record.location?.id || "",
        date: record.date ? record.date.split("T")[0] : new Date().toISOString().split("T")[0],
        totalSales: String(record.totalSales || ""),
        tva: String(record.tva || ""),
        salesExVat: String(record.salesExVat || ""),
        receiptCount: String(record.receiptCount || ""),
        avgReceipt: String(record.avgReceipt || ""),
        barSales: String(record.barSales || ""),
        barProductCount: String(record.barProductCount || ""),
        kitchenSales: String(record.kitchenSales || ""),
        kitchenProductCount: String(record.kitchenProductCount || ""),
        cashAmount: String(record.cashAmount || ""),
        cardAmount: String(record.cardAmount || ""),
        transferAmount: String(record.transferAmount || ""),
        accountAmount: String(record.accountAmount || ""),
        deliveryAmount: String(record.deliveryAmount || ""),
        tipsFiscal: String(record.tipsFiscal || ""),
        tipsTotal: String(record.tipsTotal || ""),
      });
    } else {
      setForm(emptyForm(defaultLocationId));
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, open, defaultLocationId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.locationId) errs.locationId = "Obligatoriu";
    if (!form.date) errs.date = "Obligatoriu";
    if (!form.totalSales || parseFloat(form.totalSales) < 0) errs.totalSales = "Suma invalida";
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
        date: form.date,
        totalSales: parseFloat(form.totalSales) || 0,
        tva: parseFloat(form.tva) || 0,
        salesExVat: parseFloat(form.salesExVat) || 0,
        receiptCount: parseInt(form.receiptCount) || 0,
        avgReceipt: parseFloat(form.avgReceipt) || 0,
        barSales: parseFloat(form.barSales) || 0,
        barProductCount: parseInt(form.barProductCount) || 0,
        kitchenSales: parseFloat(form.kitchenSales) || 0,
        kitchenProductCount: parseInt(form.kitchenProductCount) || 0,
        cashAmount: parseFloat(form.cashAmount) || 0,
        cardAmount: parseFloat(form.cardAmount) || 0,
        transferAmount: parseFloat(form.transferAmount) || 0,
        accountAmount: parseFloat(form.accountAmount) || 0,
        deliveryAmount: parseFloat(form.deliveryAmount) || 0,
        tipsFiscal: parseFloat(form.tipsFiscal) || 0,
        tipsTotal: parseFloat(form.tipsTotal) || 0,
      };

      const url = isEdit ? `/api/daily-income/${record!.id}` : "/api/daily-income";
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
        title: isEdit ? "Inregistrare actualizata" : "Inregistrare adaugata",
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
      title={isEdit ? "Editeaza incasare zilnica" : "Adauga incasare zilnica"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">Locatie *</label>
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
          {errors.locationId && <p className="mt-1 text-xs text-danger">{errors.locationId}</p>}
        </div>

        {/* Date */}
        <Input
          id="date"
          name="date"
          type="date"
          label="Data *"
          value={form.date}
          onChange={handleChange}
          error={errors.date}
        />

        {/* Sales totals */}
        <fieldset className="rounded-lg border border-border p-3 space-y-3">
          <legend className="px-2 text-xs font-semibold text-text-muted uppercase">Vanzari</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="totalSales"
              name="totalSales"
              type="number"
              label="Total Vanzari (cu TVA) *"
              value={form.totalSales}
              onChange={handleChange}
              error={errors.totalSales}
            />
            <Input
              id="tva"
              name="tva"
              type="number"
              label="TVA"
              value={form.tva}
              onChange={handleChange}
            />
            <Input
              id="salesExVat"
              name="salesExVat"
              type="number"
              label="Fara TVA"
              value={form.salesExVat}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="receiptCount"
              name="receiptCount"
              type="number"
              label="Nr. bonuri"
              value={form.receiptCount}
              onChange={handleChange}
            />
            <Input
              id="avgReceipt"
              name="avgReceipt"
              type="number"
              label="Cec mediu"
              value={form.avgReceipt}
              onChange={handleChange}
            />
          </div>
        </fieldset>

        {/* Department breakdown */}
        <fieldset className="rounded-lg border border-border p-3 space-y-3">
          <legend className="px-2 text-xs font-semibold text-text-muted uppercase">
            Departamente
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="barSales"
              name="barSales"
              type="number"
              label="Bar (RON)"
              value={form.barSales}
              onChange={handleChange}
            />
            <Input
              id="barProductCount"
              name="barProductCount"
              type="number"
              label="Nr. produse Bar"
              value={form.barProductCount}
              onChange={handleChange}
            />
            <Input
              id="kitchenSales"
              name="kitchenSales"
              type="number"
              label="Bucatarie (RON)"
              value={form.kitchenSales}
              onChange={handleChange}
            />
            <Input
              id="kitchenProductCount"
              name="kitchenProductCount"
              type="number"
              label="Nr. produse Bucatarie"
              value={form.kitchenProductCount}
              onChange={handleChange}
            />
          </div>
        </fieldset>

        {/* Payment methods */}
        <fieldset className="rounded-lg border border-border p-3 space-y-3">
          <legend className="px-2 text-xs font-semibold text-text-muted uppercase">
            Metode de plata
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="cashAmount"
              name="cashAmount"
              type="number"
              label="Cash"
              value={form.cashAmount}
              onChange={handleChange}
            />
            <Input
              id="cardAmount"
              name="cardAmount"
              type="number"
              label="Card"
              value={form.cardAmount}
              onChange={handleChange}
            />
            <Input
              id="transferAmount"
              name="transferAmount"
              type="number"
              label="Virament"
              value={form.transferAmount}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="accountAmount"
              name="accountAmount"
              type="number"
              label="Cont"
              value={form.accountAmount}
              onChange={handleChange}
            />
            <Input
              id="deliveryAmount"
              name="deliveryAmount"
              type="number"
              label="Livrator"
              value={form.deliveryAmount}
              onChange={handleChange}
            />
          </div>
        </fieldset>

        {/* Tips */}
        <fieldset className="rounded-lg border border-border p-3 space-y-3">
          <legend className="px-2 text-xs font-semibold text-text-muted uppercase">Tips</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="tipsFiscal"
              name="tipsFiscal"
              type="number"
              label="Tips Fiscal"
              value={form.tipsFiscal}
              onChange={handleChange}
            />
            <Input
              id="tipsTotal"
              name="tipsTotal"
              type="number"
              label="Tips Total"
              value={form.tipsTotal}
              onChange={handleChange}
            />
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

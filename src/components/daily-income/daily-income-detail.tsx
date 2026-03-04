"use client";

import { Modal, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface DailyIncomeData {
  id: string;
  locationId: string;
  date: string;
  dayOfWeek: string | null;
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
  createdAt: string;
  location: { id: string; code: string; name: string };
}

interface Props {
  record: DailyIncomeData | null;
  onClose: () => void;
  onEdit?: (record: DailyIncomeData) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border-light last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text text-right max-w-[60%]">{value || "-"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h4 className="mb-1 text-xs font-semibold uppercase text-text-muted">{title}</h4>
      <div className="rounded-lg border border-border-light p-2">{children}</div>
    </div>
  );
}

export function DailyIncomeDetailModal({ record, onClose, onEdit }: Props) {
  if (!record) return null;

  return (
    <Modal
      open={!!record}
      onOpenChange={() => onClose()}
      title="Detalii incasare zilnica"
      description={`${record.location.name} — ${new Date(record.date).toLocaleDateString("ro-RO")}`}
    >
      <div className="space-y-1">
        <DetailRow
          label="Total Vanzari"
          value={<span className="text-lg font-bold">{formatCurrency(record.totalSales)}</span>}
        />
        <DetailRow
          label="Locatie"
          value={
            <Badge variant="outline">
              {record.location.name} ({record.location.code})
            </Badge>
          }
        />
        <DetailRow
          label="Data"
          value={`${new Date(record.date).toLocaleDateString("ro-RO")}${record.dayOfWeek ? ` (${record.dayOfWeek})` : ""}`}
        />
      </div>

      <Section title="Vanzari">
        <DetailRow label="TVA" value={formatCurrency(record.tva)} />
        <DetailRow label="Fara TVA" value={formatCurrency(record.salesExVat)} />
        <DetailRow label="Nr. bonuri" value={record.receiptCount} />
        <DetailRow label="Cec mediu" value={formatCurrency(record.avgReceipt)} />
      </Section>

      <Section title="Departamente">
        <DetailRow label="Bar" value={formatCurrency(record.barSales)} />
        <DetailRow label="Nr. produse Bar" value={record.barProductCount} />
        <DetailRow label="Bucatarie" value={formatCurrency(record.kitchenSales)} />
        <DetailRow label="Nr. produse Bucatarie" value={record.kitchenProductCount} />
      </Section>

      <Section title="Metode de plata">
        <DetailRow label="Cash" value={formatCurrency(record.cashAmount)} />
        <DetailRow label="Card" value={formatCurrency(record.cardAmount)} />
        <DetailRow label="Virament" value={formatCurrency(record.transferAmount)} />
        <DetailRow label="Cont" value={formatCurrency(record.accountAmount)} />
        <DetailRow label="Livrator" value={formatCurrency(record.deliveryAmount)} />
      </Section>

      <Section title="Tips">
        <DetailRow label="Tips Fiscal" value={formatCurrency(record.tipsFiscal)} />
        <DetailRow label="Tips Total" value={formatCurrency(record.tipsTotal)} />
      </Section>

      <div className="mt-4 flex items-center justify-end border-t border-border pt-4">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(record)}>
            <Pencil className="h-4 w-4" />
            Editeaza
          </Button>
        )}
      </div>
    </Modal>
  );
}

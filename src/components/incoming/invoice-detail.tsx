"use client";

import { Modal, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: string | null;
  dueDate: string | null;
  itemDescription: string | null;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  notes: string | null;
  location: { id: string; code: string; name: string };
  supplier: { id: string; name: string };
}

interface Props {
  invoice: InvoiceData | null;
  onClose: () => void;
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "danger" | "warning" }> = {
  PAID: { label: "Platita", variant: "success" },
  UNPAID: { label: "Neplatita", variant: "danger" },
  PARTIAL: { label: "Partial platita", variant: "warning" },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border-light last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text text-right max-w-[60%]">{value || "-"}</span>
    </div>
  );
}

export function InvoiceDetailModal({ invoice, onClose }: Props) {
  if (!invoice) return null;

  const statusInfo = STATUS_MAP[invoice.status] || STATUS_MAP.UNPAID;

  return (
    <Modal
      open={!!invoice}
      onOpenChange={() => onClose()}
      title={`Factura ${invoice.invoiceNumber}`}
      description={`${invoice.supplier.name} — ${invoice.location.name}`}
    >
      <div className="space-y-1">
        <DetailRow label="Nr. Factura" value={invoice.invoiceNumber} />
        <DetailRow label="Furnizor" value={invoice.supplier.name} />
        <DetailRow
          label="Locatie"
          value={
            <Badge variant="outline">
              {invoice.location.name} ({invoice.location.code})
            </Badge>
          }
        />
        <DetailRow label="Data Emitere" value={invoice.issueDate} />
        <DetailRow
          label="Scadenta"
          value={
            invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString("ro-RO")
              : null
          }
        />
        <DetailRow label="Descriere" value={invoice.itemDescription} />
        <DetailRow label="Cantitate" value={invoice.qty > 0 ? invoice.qty : "-"} />
        <DetailRow
          label="Pret unitar"
          value={invoice.unitPrice > 0 ? formatCurrency(invoice.unitPrice) : "-"}
        />
        <DetailRow
          label="Total"
          value={
            <span className="text-base font-bold">
              {formatCurrency(invoice.totalAmount)}
            </span>
          }
        />
        <DetailRow
          label="Status"
          value={<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
        />
        {invoice.notes && <DetailRow label="Observatii" value={invoice.notes} />}
      </div>
    </Modal>
  );
}

"use client";

import { Modal, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Printer, Pencil } from "lucide-react";
import { RECEIPT_TYPES, PAYMENT_METHODS } from "@/lib/validations/receipt";

interface ReceiptData {
  id: string;
  locationId: string;
  date: string;
  type: string;
  description: string | null;
  category: string | null;
  amount: number;
  paymentMethod: string;
  receiptNumber: string | null;
  notes: string | null;
  createdAt: string;
  location: { id: string; code: string; name: string };
}

interface Props {
  receipt: ReceiptData | null;
  onClose: () => void;
  onEdit?: (receipt: ReceiptData) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border-light last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text text-right max-w-[60%]">{value || "-"}</span>
    </div>
  );
}

export function ReceiptDetailModal({ receipt, onClose, onEdit }: Props) {
  if (!receipt) return null;

  const typeInfo = RECEIPT_TYPES.find((t) => t.value === receipt.type) || RECEIPT_TYPES[0];
  const paymentInfo = PAYMENT_METHODS.find((p) => p.value === receipt.paymentMethod);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const dateStr = new Date(receipt.date).toLocaleDateString("ro-RO");
    printWindow.document.write(`
      <html>
        <head>
          <title>Bon ${receipt.receiptNumber || receipt.id.slice(-6)}</title>
          <style>
            body { font-family: Inter, system-ui, sans-serif; padding: 40px; color: #333; max-width: 400px; margin: 0 auto; }
            h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
            h2 { font-size: 13px; color: #666; font-weight: normal; text-align: center; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; }
            .label { color: #888; }
            .value { font-weight: 500; }
            .total { font-size: 24px; font-weight: 700; text-align: center; padding: 16px 0; }
          </style>
        </head>
        <body>
          <h1>${receipt.location.name}</h1>
          <h2>${dateStr}</h2>
          <div class="total">${receipt.amount.toLocaleString("ro-RO")} RON</div>
          <div class="row"><span class="label">Tip</span><span class="value">${typeInfo.label}</span></div>
          <div class="row"><span class="label">Plata</span><span class="value">${paymentInfo?.label || receipt.paymentMethod}</span></div>
          ${receipt.category ? `<div class="row"><span class="label">Categorie</span><span class="value">${receipt.category}</span></div>` : ""}
          ${receipt.description ? `<div class="row"><span class="label">Descriere</span><span class="value">${receipt.description}</span></div>` : ""}
          ${receipt.receiptNumber ? `<div class="row"><span class="label">Nr. bon</span><span class="value">${receipt.receiptNumber}</span></div>` : ""}
          ${receipt.notes ? `<div class="row"><span class="label">Note</span><span class="value">${receipt.notes}</span></div>` : ""}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Modal
      open={!!receipt}
      onOpenChange={() => onClose()}
      title={`Incasare ${receipt.receiptNumber || ""}`}
      description={`${receipt.location.name} — ${new Date(receipt.date).toLocaleDateString("ro-RO")}`}
    >
      <div className="space-y-1">
        <DetailRow
          label="Suma"
          value={<span className="text-lg font-bold">{formatCurrency(receipt.amount)}</span>}
        />
        <DetailRow label="Tip" value={<Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>} />
        <DetailRow label="Metoda de plata" value={paymentInfo?.label || receipt.paymentMethod} />
        <DetailRow
          label="Locatie"
          value={
            <Badge variant="outline">
              {receipt.location.name} ({receipt.location.code})
            </Badge>
          }
        />
        <DetailRow label="Data" value={new Date(receipt.date).toLocaleDateString("ro-RO")} />
        {receipt.category && <DetailRow label="Categorie" value={receipt.category} />}
        {receipt.receiptNumber && <DetailRow label="Nr. bon" value={receipt.receiptNumber} />}
        {receipt.description && <DetailRow label="Descriere" value={receipt.description} />}
        {receipt.notes && <DetailRow label="Observatii" value={receipt.notes} />}
        <DetailRow label="Creat la" value={new Date(receipt.createdAt).toLocaleString("ro-RO")} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Printeaza
        </Button>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(receipt)}>
            <Pencil className="h-4 w-4" />
            Editeaza
          </Button>
        )}
      </div>
    </Modal>
  );
}

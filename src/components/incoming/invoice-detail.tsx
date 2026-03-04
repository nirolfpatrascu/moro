"use client";

import { Modal, Badge, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Printer, CheckCircle, Pencil } from "lucide-react";

interface InvoiceData {
  id: string;
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
  paidAmount: number;
  remainingAmount: number;
  status: string;
  notes: string | null;
  plCategory: string;
  category: string;
  subcategory: string | null;
  year: number;
  month: string;
  paymentYear: number | null;
  paymentMonth: string | null;
  paymentDay: number | null;
  location: { id: string; code: string; name: string };
  supplier: { id: string; name: string };
}

interface Props {
  invoice: InvoiceData | null;
  onClose: () => void;
  onMarkPaid?: (invoice: InvoiceData) => void;
  onEdit?: (invoice: InvoiceData) => void;
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

export function InvoiceDetailModal({ invoice, onClose, onMarkPaid, onEdit }: Props) {
  if (!invoice) return null;

  const statusInfo = STATUS_MAP[invoice.status] || STATUS_MAP.UNPAID;

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Factura ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Inter, system-ui, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 14px; color: #666; font-weight: normal; margin-bottom: 24px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .label { color: #888; font-size: 14px; }
            .value { font-weight: 500; font-size: 14px; text-align: right; }
            .section { margin-top: 20px; padding-top: 16px; border-top: 2px solid #ddd; }
            .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
            .total { font-size: 18px; font-weight: 700; }
            .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
            .badge-success { background: #e8f5e9; color: #2e7d32; }
            .badge-danger { background: #ffebee; color: #c62828; }
            .badge-warning { background: #fff3e0; color: #e65100; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const paymentDate =
    invoice.paymentDay && invoice.paymentMonth && invoice.paymentYear
      ? `${invoice.paymentDay} ${invoice.paymentMonth} ${invoice.paymentYear}`
      : null;

  return (
    <Modal
      open={!!invoice}
      onOpenChange={() => onClose()}
      title={`Factura ${invoice.invoiceNumber}`}
      description={`${invoice.supplier.name} — ${invoice.location.name}`}
      className="max-w-lg"
    >
      <div id="invoice-print-area">
        {/* Print-only header (hidden in modal) */}
        <div className="hidden print:block">
          <h1>Factura {invoice.invoiceNumber}</h1>
          <h2>
            {invoice.supplier.name} — {invoice.location.name}
          </h2>
        </div>

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
            value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("ro-RO") : null}
          />
          <DetailRow label="Descriere" value={invoice.itemDescription} />
          <DetailRow label="Cantitate" value={invoice.qty > 0 ? invoice.qty : "-"} />
          <DetailRow
            label="Pret unitar"
            value={invoice.unitPrice > 0 ? formatCurrency(invoice.unitPrice) : "-"}
          />
        </div>

        {/* Amounts section */}
        <div className="mt-4 rounded-lg bg-background p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Sume
          </p>
          <DetailRow label="Suma fara TVA" value={formatCurrency(invoice.amountExVat)} />
          <DetailRow label="TVA" value={formatCurrency(invoice.vatAmount)} />
          <DetailRow
            label="Total"
            value={
              <span className="text-base font-bold">{formatCurrency(invoice.totalAmount)}</span>
            }
          />
        </div>

        {/* Payment section */}
        <div className="mt-4 rounded-lg bg-background p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Plata
          </p>
          <DetailRow
            label="Status"
            value={<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
          />
          <DetailRow label="Suma platita" value={formatCurrency(invoice.paidAmount)} />
          <DetailRow label="Rest de plata" value={formatCurrency(invoice.remainingAmount)} />
          {paymentDate && <DetailRow label="Data platii" value={paymentDate} />}
        </div>

        {/* P&L Classification */}
        <div className="mt-4 rounded-lg bg-background p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Clasificare P&L
          </p>
          <DetailRow label="Categorie P&L" value={<Badge>{invoice.plCategory}</Badge>} />
          <DetailRow label="Categorie" value={invoice.category} />
          {invoice.subcategory && <DetailRow label="Subcategorie" value={invoice.subcategory} />}
          <DetailRow label="Perioada" value={`${invoice.month} ${invoice.year}`} />
        </div>

        {invoice.notes && (
          <div className="mt-4 rounded-lg bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Observatii
            </p>
            <p className="text-sm text-text">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Printeaza
        </Button>
        <div className="flex items-center gap-2">
          {invoice.status !== "PAID" && onMarkPaid && (
            <Button variant="primary" size="sm" onClick={() => onMarkPaid(invoice)}>
              <CheckCircle className="h-4 w-4" />
              Marcheaza ca platita
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(invoice)}>
              <Pencil className="h-4 w-4" />
              Editeaza
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

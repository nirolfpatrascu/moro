"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, FileInput, FileOutput } from "lucide-react";
import { ChartSkeleton } from "./skeleton";

interface AlertsData {
  overduePayables: number;
  overdueReceivables: number;
  totalOverdue: number;
  highValueUnpaid: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string | null;
    supplier: { name: string };
  }[];
}

export function OverdueAlerts({ data, loading }: { data: AlertsData | null; loading: boolean }) {
  if (loading || !data) return <ChartSkeleton title="Alerte" height="h-80" />;

  const hasAlerts = data.totalOverdue > 0 || data.highValueUnpaid.length > 0;

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle className="flex items-center gap-2">
          Alerte
          {data.totalOverdue > 0 && <Badge variant="danger">{data.totalOverdue}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <div className="flex h-40 items-center justify-center text-success text-sm">
            Totul este in regula — nu exista alerte
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data.overduePayables > 0 && (
              <Link href="/incoming?status=UNPAID" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-danger/20 bg-danger-light p-3 transition-colors hover:bg-danger/10">
                  <FileInput className="h-5 w-5 shrink-0 text-danger" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-danger">
                      {data.overduePayables} facturi de plata restante
                    </p>
                    <p className="text-xs text-danger/70">Facturi cu scadenta depasita</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                </div>
              </Link>
            )}

            {data.overdueReceivables > 0 && (
              <Link href="/outgoing" className="block">
                <div className="flex items-center gap-3 rounded-lg border border-warning/20 bg-warning-light p-3 transition-colors hover:bg-warning/10">
                  <FileOutput className="h-5 w-5 shrink-0 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-warning">
                      {data.overdueReceivables} facturi de incasat restante
                    </p>
                    <p className="text-xs text-warning/70">Clienti cu plati intarziate</p>
                  </div>
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                </div>
              </Link>
            )}

            {data.highValueUnpaid.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Facturi mari neplatite
                </p>
                {data.highValueUnpaid.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between border-b border-border-light py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text truncate">
                        {inv.invoiceNumber} — {inv.supplier.name}
                      </p>
                      {inv.dueDate && (
                        <p className="text-xs text-text-muted">
                          Scadenta: {new Date(inv.dueDate).toLocaleDateString("ro-RO")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-danger">
                      {formatCurrency(inv.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { ChartSkeleton } from "./skeleton";

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  location: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" | "outline"; sign: string }
> = {
  receipt: { label: "Incasare", variant: "success", sign: "+" },
  refund: { label: "Retur", variant: "warning", sign: "-" },
  expense: { label: "Cheltuiala", variant: "danger", sign: "-" },
  payable: { label: "Factura primita", variant: "danger", sign: "-" },
  receivable: { label: "Factura emisa", variant: "default", sign: "+" },
};

export function RecentTransactions({
  data,
  loading,
}: {
  data: Transaction[] | null;
  loading: boolean;
}) {
  if (loading || !data) return <ChartSkeleton title="Tranzactii Recente" height="h-80" />;

  return (
    <Card>
      <CardHeader className="justify-center">
        <CardTitle>Tranzactii Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-text-muted text-sm">
            Nu exista tranzactii recente
          </div>
        ) : (
          <div className="space-y-0 max-h-80 overflow-y-auto">
            {data.map((tx) => {
              const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.receipt;
              const timeAgo = getTimeAgo(tx.date);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-border-light py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={config.variant} className="shrink-0 text-[10px]">
                      {config.label}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm text-text truncate max-w-[200px]">{tx.description}</p>
                      <p className="text-xs text-text-muted">
                        {tx.location} &middot; {timeAgo}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      config.sign === "+" ? "text-success" : "text-danger"
                    }`}
                  >
                    {config.sign}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}z`;
  return new Date(dateStr).toLocaleDateString("ro-RO");
}

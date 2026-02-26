import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { TrendingUp } from "lucide-react";

export default function PnlDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Profit & Loss</h2>
        <p className="mt-1 text-sm text-text-muted">
          Raport P&L per locatie si luna
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>P&L Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <TrendingUp className="h-12 w-12 text-border" />
            <p>Dashboard-ul P&L va fi implementat in Sprint 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

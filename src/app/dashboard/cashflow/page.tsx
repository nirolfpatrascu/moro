import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Wallet } from "lucide-react";

export default function CashFlowDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Cash Flow</h2>
        <p className="mt-1 text-sm text-text-muted">
          Raport cash flow per locatie si luna
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <Wallet className="h-12 w-12 text-border" />
            <p>Dashboard-ul Cash Flow va fi implementat in Sprint 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { BarChart3 } from "lucide-react";

export default function CogsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">COGS</h2>
        <p className="mt-1 text-sm text-text-muted">
          Cost of Goods Sold per locatie si luna
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>COGS Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <BarChart3 className="h-12 w-12 text-border" />
            <p>Dashboard-ul COGS va fi implementat in Sprint 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

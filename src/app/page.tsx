import { StatCard } from "@/components/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  TrendingUp,
  Receipt,
  Wallet,
  BarChart3,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text">Bun venit la Moro</h2>
        <p className="mt-1 text-sm text-text-muted">
          Sumar general pentru toate locatiile
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vanzari Luna"
          value="— RON"
          subtitle="vs. luna anterioara"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Nr. Bonuri"
          value="—"
          subtitle="luna curenta"
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          title="Cash Flow"
          value="— RON"
          subtitle="sold curent"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          title="COGS %"
          value="— %"
          subtitle="luna curenta"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      {/* Placeholder charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vanzari Zilnice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-text-muted">
              Graficul va fi disponibil dupa introducerea datelor
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distributie Venituri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center text-text-muted">
              Graficul va fi disponibil dupa introducerea datelor
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

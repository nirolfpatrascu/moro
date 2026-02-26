import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Truck } from "lucide-react";

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Furnizori</h2>
          <p className="mt-1 text-sm text-text-muted">
            Lista furnizorilor
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Furnizori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <Truck className="h-12 w-12 text-border" />
            <p>Lista furnizorilor va fi implementata in Sprint 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

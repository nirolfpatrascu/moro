import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Clienti</h2>
          <p className="mt-1 text-sm text-text-muted">
            Lista clientilor
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clienti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <Users className="h-12 w-12 text-border" />
            <p>Lista clientilor va fi implementata in Sprint 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

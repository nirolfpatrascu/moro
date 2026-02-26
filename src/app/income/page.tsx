import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Receipt } from "lucide-react";

export default function IncomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Incasari Zilnice</h2>
          <p className="mt-1 text-sm text-text-muted">
            Inregistreaza vanzarile zilnice per locatie
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incasari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <Receipt className="h-12 w-12 text-border" />
            <p>Formularul de incasari zilnice va fi implementat in Sprint 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

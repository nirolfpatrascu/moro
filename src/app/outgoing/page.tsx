import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { FileOutput } from "lucide-react";

export default function OutgoingInvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Iesire Facturi</h2>
          <p className="mt-1 text-sm text-text-muted">
            Facturi emise catre clienti
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturi Iesire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <FileOutput className="h-12 w-12 text-border" />
            <p>Tabelul de facturi iesire va fi implementat in Sprint 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

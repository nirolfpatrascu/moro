import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { FileInput } from "lucide-react";

export default function IncomingInvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Intrare Facturi</h2>
          <p className="mt-1 text-sm text-text-muted">
            Facturi primite de la furnizori
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturi Intrare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <FileInput className="h-12 w-12 text-border" />
            <p>Tabelul de facturi intrare va fi implementat in Sprint 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

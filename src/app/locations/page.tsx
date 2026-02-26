import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { MapPin } from "lucide-react";

export default function LocationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Locatii</h2>
          <p className="mt-1 text-sm text-text-muted">
            Locatiile cafenelelor Moro
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locatii</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-text-muted">
            <MapPin className="h-12 w-12 text-border" />
            <p>Managementul locatiilor va fi implementat in Sprint 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

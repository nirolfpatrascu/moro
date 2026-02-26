"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-danger-light p-4">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>
      <h2 className="text-xl font-semibold text-text">Ceva nu a mers bine</h2>
      <p className="max-w-md text-sm text-text-muted">
        {error.message || "A aparut o eroare neasteptata. Incearca din nou."}
      </p>
      <Button variant="primary" onClick={reset}>
        Incearca din nou
      </Button>
    </div>
  );
}

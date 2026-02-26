import Link from "next/link";
import { Coffee } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <Coffee className="h-16 w-16 text-primary/30" />
      <h2 className="text-2xl font-bold text-text">404</h2>
      <p className="text-sm text-text-muted">Pagina nu a fost gasita.</p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
      >
        Inapoi la Dashboard
      </Link>
    </div>
  );
}

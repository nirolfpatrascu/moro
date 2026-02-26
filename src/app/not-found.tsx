import Link from "next/link";
import { Coffee } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <Coffee className="h-16 w-16 text-primary/30" />
      <h2 className="text-xl font-semibold text-[#2D1B0E]">404</h2>
      <p className="text-sm text-[#9B8B7F]">Pagina nu a fost gasita.</p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
      >
        Inapoi la Dashboard
      </Link>
    </div>
  );
}

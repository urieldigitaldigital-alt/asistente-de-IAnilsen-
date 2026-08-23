import Image from "next/image";
import Link from "next/link";

export function MarketingNavbar() {
  // Sin backdrop-blur: combinado con el degradado del Hero causaba fallas de
  // renderizado (capas en blanco) en algunos motores headless/GPU.
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
          Asistente Nilsen IA
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}

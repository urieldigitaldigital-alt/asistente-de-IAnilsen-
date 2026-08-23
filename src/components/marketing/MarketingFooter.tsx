import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted sm:flex-row sm:px-6">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Image src="/logo.png" alt="" width={20} height={20} className="rounded-md" />
          Asistente Nilsen IA
        </span>
        <p>© {new Date().getFullYear()} Asistente Nilsen IA. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

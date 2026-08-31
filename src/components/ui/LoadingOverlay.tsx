/** Overlay de pantalla completa con una animación de carga — por fuera de cualquier tarjeta/formulario, para acciones que pueden tardar (login, registro). */
export function LoadingOverlay({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
      <p className="text-sm font-medium text-foreground">{text}</p>
    </div>
  );
}

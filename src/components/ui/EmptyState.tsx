import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

// Sin "use client": puede renderizarse desde Server Components. El `icon`
// recibido debe venir de "@phosphor-icons/react/dist/ssr" (sin hooks/context)
// para que funcione ahí; si este componente se usa dentro de un árbol de
// cliente, cualquiera de las dos variantes funciona igual.
export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <IconComponent size={32} className="text-muted" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

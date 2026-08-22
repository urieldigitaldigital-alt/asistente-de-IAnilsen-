import type { Icon } from "@phosphor-icons/react";

import { Card } from "@/components/ui/Card";

// Sin "use client": pasa un icono de "@phosphor-icons/react/dist/ssr" cuando
// se use desde un Server Component (ver nota en EmptyState.tsx).
export function StatTile({ label, value, icon: IconComponent }: { label: string; value: string; icon: Icon }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconComponent size={22} weight="bold" />
      </div>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </Card>
  );
}

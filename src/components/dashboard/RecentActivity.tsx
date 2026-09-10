import {
  CalendarCheckIcon,
  ClockCounterClockwiseIcon,
  PhoneIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardActivityItem } from "@/lib/dashboardData";

const TYPE_CONFIG: Record<DashboardActivityItem["type"], { icon: typeof PhoneIcon; classes: string }> = {
  call: { icon: PhoneIcon, classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  whatsapp: { icon: WhatsappLogoIcon, classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  booking: { icon: CalendarCheckIcon, classes: "bg-primary/10 text-primary" },
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();
  return isToday
    ? new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(date)
    : new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

export function RecentActivity({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClockCounterClockwiseIcon}
        title="Todavía no hay actividad"
        description="Las llamadas, mensajes de WhatsApp y citas nuevas van a aparecer acá a medida que pasen."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const { icon: IconComponent, classes } = TYPE_CONFIG[item.type];
        return (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${classes}`}>
              <IconComponent size={18} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted">{item.subtitle || "—"}</p>
            </div>
            <span className="shrink-0 text-xs text-muted">{formatWhen(item.when)}</span>
          </li>
        );
      })}
    </ul>
  );
}

import type { Icon } from "@phosphor-icons/react";
import {
  CalendarBlankIcon,
  ChartLineUpIcon,
  ChatCircleTextIcon,
  ForkKnifeIcon,
  GearSixIcon,
  HouseLineIcon,
  TableIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { PushNotificationToggle } from "@/components/crm/PushNotificationToggle";
import type { BusinessType } from "@/types/database";

function shortcutsFor(businessType: BusinessType): { href: string; label: string; icon: Icon }[] {
  switch (businessType) {
    case "pedidos":
      return [{ href: "/pedidos", label: "Pedidos", icon: ForkKnifeIcon }];
    case "restaurante":
      return [
        { href: "/pedidos", label: "Pedidos", icon: ForkKnifeIcon },
        { href: "/mesas", label: "Mesas", icon: TableIcon },
      ];
    case "inmobiliaria":
      return [{ href: "/propiedades", label: "Propiedades", icon: HouseLineIcon }];
    case "llamadas":
      return [{ href: "/transcripciones", label: "Transcripciones", icon: ChatCircleTextIcon }];
    case "citas":
    default:
      return [
        { href: "/calendario", label: "Calendario", icon: CalendarBlankIcon },
        { href: "/crm", label: "CRM", icon: ChartLineUpIcon },
      ];
  }
}

export function QuickActions({ businessType }: { businessType: BusinessType }) {
  const shortcuts = [
    ...shortcutsFor(businessType),
    { href: "/whatsapp", label: "WhatsApp", icon: WhatsappLogoIcon },
    { href: "/personalizacion", label: "Personalización", icon: GearSixIcon },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shortcuts.map(({ href, label, icon: IconComponent }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
        >
          <IconComponent size={16} weight="bold" className="text-primary" />
          {label}
        </Link>
      ))}
      <PushNotificationToggle />
    </div>
  );
}

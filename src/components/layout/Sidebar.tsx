"use client";

import {
  CalendarBlankIcon,
  ChatCircleTextIcon,
  GearSixIcon,
  PlugsConnectedIcon,
  RobotIcon,
  SquaresFourIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFourIcon },
  { href: "/calendario", label: "Calendario", icon: CalendarBlankIcon },
  { href: "/whatsapp", label: "WhatsApp", icon: WhatsappLogoIcon },
  { href: "/transcripciones", label: "Transcripciones", icon: ChatCircleTextIcon },
  { href: "/personalizacion", label: "Personalización", icon: GearSixIcon },
  { href: "/integraciones", label: "Integraciones", icon: PlugsConnectedIcon },
];

export function Sidebar({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <RobotIcon size={24} weight="fill" className="text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{clinicName}</p>
          <p className="text-xs text-muted">Asistente Nilsen IA</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <ItemIcon size={18} weight={active ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around border-t border-border bg-surface py-1.5 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] ${active ? "text-primary" : "text-muted"}`}
          >
            <ItemIcon size={20} weight={active ? "fill" : "regular"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

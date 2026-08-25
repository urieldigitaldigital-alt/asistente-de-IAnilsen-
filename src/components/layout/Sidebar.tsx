"use client";

import {
  CalendarBlankIcon,
  ChatCircleTextIcon,
  ForkKnifeIcon,
  GearSixIcon,
  HouseLineIcon,
  PlugsConnectedIcon,
  SquaresFourIcon,
  TableIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { BusinessType } from "@/types/database";

// Cada rubro solo ve las pantallas que le corresponden — "llamadas" no tiene
// ninguna pantalla de dominio propia (solo toma consultas por teléfono).
function getDomainNavItems(businessType: BusinessType) {
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
      return [];
    case "citas":
    default:
      return [{ href: "/calendario", label: "Calendario", icon: CalendarBlankIcon }];
  }
}

function getNavItems(businessType: BusinessType) {
  return [
    { href: "/dashboard", label: "Dashboard", icon: SquaresFourIcon },
    ...getDomainNavItems(businessType),
    { href: "/whatsapp", label: "WhatsApp", icon: WhatsappLogoIcon },
    { href: "/transcripciones", label: "Transcripciones", icon: ChatCircleTextIcon },
    { href: "/personalizacion", label: "Personalización", icon: GearSixIcon },
    { href: "/integraciones", label: "Integraciones", icon: PlugsConnectedIcon },
  ];
}

/** Reservas de mesa sin asignar (necesitan que alguien las asigne a mano) — se actualiza en vivo. */
function usePendingReservations(clinicId: string | null, businessType: BusinessType, initial: number): number {
  const [count, setCount] = useState(initial);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!clinicId || businessType !== "restaurante") return;

    const refresh = () => {
      supabase
        .from("table_reservations")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "pendiente")
        .then(({ count: fresh }) => setCount(fresh ?? 0));
    };

    const channel = supabase
      .channel(`sidebar_reservations_${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_reservations", filter: `clinic_id=eq.${clinicId}` }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, clinicId, businessType]);

  return clinicId && businessType === "restaurante" ? count : 0;
}

function NavLink({
  href,
  label,
  icon: ItemIcon,
  active,
  showDot,
  mobile,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "fill" | "regular" }>;
  active: boolean;
  showDot: boolean;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <Link href={href} className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] ${active ? "text-primary" : "text-muted"}`}>
        <span className="relative">
          <ItemIcon size={20} weight={active ? "fill" : "regular"} />
          {showDot && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <ItemIcon size={18} weight={active ? "fill" : "regular"} />
      {label}
      {showDot && <span className="ml-auto h-2 w-2 rounded-full bg-danger" />}
    </Link>
  );
}

export function Sidebar({
  clinicId,
  clinicName,
  businessType,
  initialPendingReservations,
}: {
  clinicId: string | null;
  clinicName: string;
  businessType: BusinessType;
  initialPendingReservations: number;
}) {
  const pathname = usePathname();
  const NAV_ITEMS = getNavItems(businessType);
  const pendingReservations = usePendingReservations(clinicId, businessType, initialPendingReservations);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{clinicName}</p>
          <p className="text-xs text-muted">Asistente Nilsen IA</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            showDot={item.href === "/mesas" && pendingReservations > 0}
          />
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav({
  clinicId,
  businessType,
  initialPendingReservations,
}: {
  clinicId: string | null;
  businessType: BusinessType;
  initialPendingReservations: number;
}) {
  const pathname = usePathname();
  const NAV_ITEMS = getNavItems(businessType);
  const pendingReservations = usePendingReservations(clinicId, businessType, initialPendingReservations);

  return (
    <nav className="flex items-center justify-around border-t border-border bg-surface py-1.5 md:hidden">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          showDot={item.href === "/mesas" && pendingReservations > 0}
          mobile
        />
      ))}
    </nav>
  );
}

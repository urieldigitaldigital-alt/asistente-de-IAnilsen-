import {
  CalendarCheckIcon,
  ChatCircleTextIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { LeadStatusActions } from "@/components/crm/LeadStatusActions";
import { OutboundCallsPanel } from "@/components/crm/OutboundCallsPanel";
import { PushNotificationToggle } from "@/components/crm/PushNotificationToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { localDateKey } from "@/lib/availability";
import { getCrmData, type CrmLead } from "@/lib/crmData";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types/database";

export const metadata: Metadata = { title: "CRM — Asistente Nilsen IA" };

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-danger/10 text-danger",
};

const FILTER_TABS: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "scheduled", label: "Agendadas" },
  { value: "completed", label: "Realizadas" },
  { value: "cancelled", label: "Canceladas" },
];

function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length >= 2 ? [parts[0][0], parts[1][0]] : [parts[0]?.[0] ?? "?"];
  return chars.join("").toUpperCase();
}

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const activeFilter = FILTER_TABS.some((t) => t.value === estado) ? (estado as AppointmentStatus | "all") : "all";

  const supabase = await createClient();
  const [{ data: clinic }, { data: config }, data] = await Promise.all([
    supabase.from("clinics").select("timezone").single(),
    supabase.from("agent_configs").select("max_appointments_per_day").single(),
    getCrmData(supabase),
  ]);
  const timeZone = clinic?.timezone ?? "America/Argentina/Buenos_Aires";
  const maxPerDay = config?.max_appointments_per_day ?? null;

  const todayKey = localDateKey(new Date(), timeZone);
  const scheduledToday = data.leads.filter(
    (lead) => lead.status === "scheduled" && localDateKey(new Date(lead.startTime), timeZone) === todayKey
  ).length;

  const filterCounts: Record<AppointmentStatus | "all", number> = {
    all: data.leads.length,
    scheduled: data.leads.filter((l) => l.status === "scheduled").length,
    completed: data.leads.filter((l) => l.status === "completed").length,
    cancelled: data.leads.filter((l) => l.status === "cancelled").length,
  };
  const visibleLeads: CrmLead[] =
    activeFilter === "all" ? data.leads : data.leads.filter((l) => l.status === activeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">CRM</h1>
          <p className="text-sm text-muted">Actividad de prospección: mensajes, llamadas y reuniones agendadas con leads.</p>
          <p className="mt-1 text-sm text-muted">
            Hoy: <span className="font-medium text-foreground">{scheduledToday}</span>
            {maxPerDay ? ` de ${maxPerDay} llamadas agendadas` : " llamadas agendadas"}
          </p>
        </div>
        <PushNotificationToggle />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile icon={ChatCircleTextIcon} label="Mensajes enviados" value={String(data.messagesSent)} />
        <StatTile icon={ChatCircleTextIcon} label="Mensajes recibidos" value={String(data.messagesReceived)} />
        <StatTile icon={PhoneIncomingIcon} label="Llamadas entrantes" value={String(data.callsInbound)} />
        <StatTile icon={PhoneOutgoingIcon} label="Llamadas salientes" value={String(data.callsOutbound)} />
        <StatTile icon={CalendarCheckIcon} label="Reuniones agendadas" value={String(data.meetingsScheduled)} />
      </div>

      <OutboundCallsPanel />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Agendas y reservas</h2>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={tab.value === "all" ? "/crm" : `/crm?estado=${tab.value}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {tab.label} <span className="opacity-70">({filterCounts[tab.value]})</span>
              </Link>
            ))}
          </div>
        </div>
        {visibleLeads.length === 0 ? (
          <EmptyState
            icon={UsersThreeIcon}
            title={data.leads.length === 0 ? "Todavía no hay agendas registradas" : "No hay agendas en este filtro"}
            description="En cuanto alguien agende una reunión por llamada o WhatsApp, va a aparecer acá."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Nombre</th>
                  <th className="pb-2 pr-4 font-medium">Teléfono</th>
                  <th className="pb-2 pr-4 font-medium">Servicio de interés</th>
                  <th className="pb-2 pr-4 font-medium">Qué busca / detalle</th>
                  <th className="pb-2 pr-4 font-medium">Reunión</th>
                  <th className="pb-2 pr-4 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                {visibleLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-border last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
                      lead.status === "cancelled" ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(lead.name)}
                        </span>
                        {lead.name}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">
                      <a href={`tel:${lead.phone}`} className="hover:text-primary hover:underline">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4">{lead.service}</td>
                    <td className="max-w-[260px] py-2.5 pr-4 text-muted" title={lead.notes ?? undefined}>
                      <span className="line-clamp-2">{lead.notes || "—"}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{formatDateTime(lead.startTime, timeZone)}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {lead.status === "scheduled" ? <LeadStatusActions appointmentId={lead.id} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

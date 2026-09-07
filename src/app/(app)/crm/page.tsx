import {
  CalendarCheckIcon,
  ChatCircleTextIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { LeadStatusActions } from "@/components/crm/LeadStatusActions";
import { OutboundCallsPanel } from "@/components/crm/OutboundCallsPanel";
import { PushNotificationToggle } from "@/components/crm/PushNotificationToggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { localDateKey } from "@/lib/availability";
import { getCrmData } from "@/lib/crmData";
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

function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function CrmPage() {
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
        <h2 className="mb-4 text-sm font-semibold">Todas las agendas y reservas</h2>
        {data.leads.length === 0 ? (
          <EmptyState
            icon={UsersThreeIcon}
            title="Todavía no hay agendas registradas"
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
                {data.leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium">{lead.name}</td>
                    <td className="py-2 pr-4 text-muted">{lead.phone}</td>
                    <td className="py-2 pr-4">{lead.service}</td>
                    <td className="max-w-[260px] py-2 pr-4 text-muted" title={lead.notes ?? undefined}>
                      <span className="line-clamp-2">{lead.notes || "—"}</span>
                    </td>
                    <td className="py-2 pr-4 text-muted">{formatDateTime(lead.startTime, timeZone)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="py-2">
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

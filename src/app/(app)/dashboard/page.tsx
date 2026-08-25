import {
  CalendarCheckIcon,
  ChatsCircleIcon,
  ClockIcon,
  CookingPotIcon,
  ForkKnifeIcon,
  PhoneIcon,
  PhoneCallIcon,
  TrendUpIcon,
  WarningCircleIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { CallsChart } from "@/components/dashboard/CallsChart";
import { InquiriesList } from "@/components/dashboard/InquiriesList";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";
import { RecentCalls } from "@/components/dashboard/RecentCalls";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { getDashboardData } from "@/lib/dashboardData";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard — Asistente Nilsen IA" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const data = await getDashboardData(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Resumen de la actividad del agente de voz.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={PhoneIcon} label="Llamadas hoy" value={String(data.callsToday)} />
        {data.businessType === "pedidos" || data.businessType === "restaurante" ? (
          <>
            <StatTile icon={ForkKnifeIcon} label="Pedidos hoy" value={String(data.ordersToday)} />
            <StatTile icon={CookingPotIcon} label="En preparación" value={String(data.ordersInPreparation)} />
            <StatTile icon={TrendUpIcon} label="Listos para entregar" value={String(data.ordersReady)} />
          </>
        ) : data.businessType === "llamadas" ? (
          <>
            <StatTile icon={PhoneCallIcon} label="Consultas hoy" value={String(data.inquiriesToday)} />
            <StatTile icon={WarningCircleIcon} label="Sin contactar" value={String(data.inquiriesPending)} />
            <StatTile
              icon={ClockIcon}
              label="Duración promedio"
              value={data.avgDurationMinutes ? `${data.avgDurationMinutes.toFixed(1)} min` : "—"}
            />
          </>
        ) : data.businessType === "citas" ? (
          <>
            <StatTile icon={CalendarCheckIcon} label="Citas agendadas" value={String(data.appointmentsScheduled)} />
            <StatTile
              icon={ClockIcon}
              label="Duración promedio"
              value={data.avgDurationMinutes ? `${data.avgDurationMinutes.toFixed(1)} min` : "—"}
            />
            <StatTile
              icon={TrendUpIcon}
              label="Tasa de agendamiento"
              value={data.bookingRatePct !== null ? `${data.bookingRatePct}%` : "—"}
            />
          </>
        ) : (
          <StatTile
            icon={ClockIcon}
            label="Duración promedio"
            value={data.avgDurationMinutes ? `${data.avgDurationMinutes.toFixed(1)} min` : "—"}
          />
        )}
      </div>

      {data.businessType === "llamadas" && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">Consultas</h2>
          <Card>
            <InquiriesList inquiries={data.recentInquiries} />
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold">WhatsApp</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={ChatsCircleIcon} label="Mensajes hoy" value={String(data.whatsappMessagesToday)} />
          <StatTile icon={WhatsappLogoIcon} label="Conversaciones activas" value={String(data.whatsappConversationsActive)} />
          <StatTile icon={WarningCircleIcon} label="Necesitan seguimiento" value={String(data.whatsappNeedsFollowUp)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Últimos 7 días</h2>
          <CallsChart data={data.chart} />
        </Card>
        <IntegrationStatus
          googleConnected={data.googleConnected}
          vapiAssistantId={data.vapiAssistantId}
          vapiPhoneNumberId={data.vapiPhoneNumberId}
        />
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Últimas llamadas</h2>
        <RecentCalls calls={data.recentCalls} />
      </Card>
    </div>
  );
}

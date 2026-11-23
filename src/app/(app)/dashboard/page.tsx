import {
  CalendarCheckIcon,
  ChatsCircleIcon,
  CookingPotIcon,
  ForkKnifeIcon,
  HouseLineIcon,
  PhoneCallIcon,
  WarningCircleIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";

import { CallsChart } from "@/components/dashboard/CallsChart";
import { InquiriesList } from "@/components/dashboard/InquiriesList";
import { IntegrationStatus } from "@/components/dashboard/IntegrationStatus";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { getDashboardData } from "@/lib/dashboardData";
import { createClient } from "@/lib/supabase/server";
import { getWhatsappCredentialsSummary } from "@/lib/whatsapp/credentials";

export const metadata: Metadata = { title: "Dashboard — Asistente Nilsen IA" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const [data, { data: clinic }] = await Promise.all([
    getDashboardData(supabase),
    supabase.from("clinics").select("id").single(),
  ]);
  const whatsappSummary = clinic ? await getWhatsappCredentialsSummary(clinic.id, supabase) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Resumen de la actividad del asistente de WhatsApp.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Accesos rápidos</h2>
        <QuickActions businessType={data.businessType} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={WhatsappLogoIcon} label="Mensajes hoy" value={String(data.whatsappMessagesToday)} />
        <StatTile icon={ChatsCircleIcon} label="Conversaciones activas" value={String(data.whatsappConversationsActive)} />
        {data.businessType === "pedidos" || data.businessType === "restaurante" ? (
          <>
            <StatTile icon={ForkKnifeIcon} label="Pedidos hoy" value={String(data.ordersToday)} />
            <StatTile icon={CookingPotIcon} label="En preparación" value={String(data.ordersInPreparation)} />
          </>
        ) : data.businessType === "llamadas" ? (
          <>
            <StatTile icon={PhoneCallIcon} label="Consultas hoy" value={String(data.inquiriesToday)} />
            <StatTile icon={WarningCircleIcon} label="Sin contactar" value={String(data.inquiriesPending)} />
          </>
        ) : data.businessType === "inmobiliaria" ? (
          <StatTile icon={HouseLineIcon} label="Visitas pendientes" value={String(data.visitsScheduled)} />
        ) : (
          <StatTile icon={CalendarCheckIcon} label="Citas agendadas" value={String(data.appointmentsScheduled)} />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Actividad reciente</h2>
          <RecentActivity items={data.recentActivity} />
        </Card>
        <IntegrationStatus googleConnected={data.googleConnected} whatsappConnected={Boolean(whatsappSummary)} />
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Últimos 7 días</h2>
        <CallsChart
          data={data.chart}
          secondaryLabel={
            data.businessType === "pedidos" || data.businessType === "restaurante"
              ? "Pedidos"
              : data.businessType === "inmobiliaria"
                ? "Visitas"
                : data.businessType === "llamadas"
                  ? "Consultas"
                  : "Citas agendadas"
          }
        />
      </Card>
    </div>
  );
}

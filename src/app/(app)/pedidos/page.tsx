import type { Metadata } from "next";

import { OrdersBoard } from "@/components/orders/OrdersBoard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pedidos — Asistente Nilsen IA" };

export default async function PedidosPage() {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id, name, timezone, address, phone").single();
  if (!clinic) return null;

  const [{ data: orders }, { data: config }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("agent_configs").select("orders_paused, pickup_only").eq("clinic_id", clinic.id).single(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="text-sm text-muted">Pedidos tomados por teléfono, en tiempo real.</p>
      </div>
      <OrdersBoard
        clinicId={clinic.id}
        clinicName={clinic.name}
        clinicAddress={clinic.address}
        clinicPhone={clinic.phone}
        timeZone={clinic.timezone}
        initialOrders={orders ?? []}
        initialOrdersPaused={config?.orders_paused ?? false}
        initialPickupOnly={config?.pickup_only ?? false}
      />
    </div>
  );
}

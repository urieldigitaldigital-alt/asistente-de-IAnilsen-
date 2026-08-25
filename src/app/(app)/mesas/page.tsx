import type { Metadata } from "next";

import { MesasBoard } from "@/components/mesas/MesasBoard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mesas — Asistente Nilsen IA" };

export default async function MesasPage() {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id, timezone").single();
  if (!clinic) return null;

  const [{ data: tables }, { data: reservations }] = await Promise.all([
    supabase.from("restaurant_tables").select("*").order("table_number", { ascending: true }),
    supabase.from("table_reservations").select("*").neq("status", "cancelada").order("reservation_time", { ascending: true }).limit(200),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mesas</h1>
        <p className="text-sm text-muted">Arrastrá las mesas para armar el salón, y asigná las reservas que llegan por teléfono.</p>
      </div>
      <MesasBoard clinicId={clinic.id} timeZone={clinic.timezone} initialTables={tables ?? []} initialReservations={reservations ?? []} />
    </div>
  );
}

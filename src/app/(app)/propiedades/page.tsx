import type { Metadata } from "next";

import { PropertiesBoard } from "@/components/properties/PropertiesBoard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Propiedades — Asistente Nilsen IA" };

export default async function PropiedadesPage() {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id, timezone").single();
  if (!clinic) return null;

  const [{ data: properties }, { data: visits }] = await Promise.all([
    supabase.from("properties").select("*").order("created_at", { ascending: false }),
    supabase
      .from("property_visits")
      .select("*")
      .neq("status", "cancelada")
      .order("visit_time", { ascending: true })
      .limit(100),
  ]);

  const titleByPropertyId = new Map((properties ?? []).map((p) => [p.id, p.title]));
  const visitsWithTitle = (visits ?? []).map((visit) => ({
    ...visit,
    propertyTitle: titleByPropertyId.get(visit.property_id) ?? "Propiedad",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Propiedades</h1>
        <p className="text-sm text-muted">Cargá tus propiedades disponibles y revisá las visitas que se agendan por teléfono.</p>
      </div>
      <PropertiesBoard
        clinicId={clinic.id}
        timeZone={clinic.timezone}
        initialProperties={properties ?? []}
        initialVisits={visitsWithTitle}
      />
    </div>
  );
}

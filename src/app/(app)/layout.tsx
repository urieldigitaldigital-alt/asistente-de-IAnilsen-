import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { MobileNav, PendingReservationsProvider, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts ya protege estas rutas; esta verificación es defensa en profundidad.
  if (!user) redirect("/login");

  const { data: clinic } = await supabase.from("clinics").select("id, name, business_type").single();
  const businessType = clinic?.business_type ?? "citas";

  let pendingReservations = 0;
  if (clinic && businessType === "restaurante") {
    const { count } = await supabase
      .from("table_reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendiente");
    pendingReservations = count ?? 0;
  }

  return (
    <PendingReservationsProvider
      clinicId={clinic?.id ?? null}
      businessType={businessType}
      initialPendingReservations={pendingReservations}
    >
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar clinicName={clinic?.name ?? "Mi negocio"} businessType={businessType} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar userLabel={user.email ?? ""} />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 md:p-6 md:pb-6">{children}</main>
          <MobileNav businessType={businessType} />
        </div>
      </div>
    </PendingReservationsProvider>
  );
}

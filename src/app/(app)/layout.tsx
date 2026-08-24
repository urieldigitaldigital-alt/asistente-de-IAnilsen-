import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { MobileNav, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts ya protege estas rutas; esta verificación es defensa en profundidad.
  if (!user) redirect("/login");

  const { data: clinic } = await supabase.from("clinics").select("name, business_type").single();
  const businessType = clinic?.business_type ?? "citas";

  return (
    <div className="flex min-h-screen">
      <Sidebar clinicName={clinic?.name ?? "Mi negocio"} businessType={businessType} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar userLabel={user.email ?? ""} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        <MobileNav businessType={businessType} />
      </div>
    </div>
  );
}

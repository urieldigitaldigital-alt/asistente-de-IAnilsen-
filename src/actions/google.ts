"use server";

import { revalidatePath } from "next/cache";

import { disconnectGoogle } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";

export async function disconnectGoogleAction(): Promise<void> {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return;

  await disconnectGoogle(supabase, clinic.id);
  revalidatePath("/integraciones");
  revalidatePath("/dashboard");
}

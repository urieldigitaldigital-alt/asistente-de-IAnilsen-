"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function setOrdersPausedAction(clinicId: string, paused: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("agent_configs").update({ orders_paused: paused }).eq("clinic_id", clinicId);
  if (error) throw error;
  revalidatePath("/pedidos");
}

export async function setPickupOnlyAction(clinicId: string, pickupOnly: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("agent_configs").update({ pickup_only: pickupOnly }).eq("clinic_id", clinicId);
  if (error) throw error;
  revalidatePath("/pedidos");
}

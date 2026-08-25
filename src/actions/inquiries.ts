"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function toggleInquiryContactedAction(inquiryId: string, contacted: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update({ contacted }).eq("id", inquiryId);
  if (error) throw error;
  revalidatePath("/dashboard");
}

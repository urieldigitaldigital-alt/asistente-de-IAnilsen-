"use server";

import { revalidatePath } from "next/cache";

import { updateOrderStatus } from "@/lib/orders";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/database";

export async function updateOrderStatusAction(orderId: string, status: OrderStatus): Promise<void> {
  const supabase = await createClient();
  await updateOrderStatus(supabase, orderId, status);
  revalidatePath("/pedidos");
}

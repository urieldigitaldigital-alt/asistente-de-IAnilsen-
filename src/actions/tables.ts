"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ReservationStatus } from "@/types/database";

export interface TableInput {
  id?: string;
  table_number: number;
  seats: number;
  pos_x: number;
  pos_y: number;
}

/** Guarda la distribución completa de mesas: crea las nuevas, actualiza posición/asientos de las existentes. */
export async function saveTablesLayoutAction(tables: TableInput[]): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return { error: "No se encontró el negocio." };

  const toInsert = tables.filter((t) => !t.id).map((t) => ({ ...t, clinic_id: clinic.id }));
  const toUpdate = tables.filter((t): t is TableInput & { id: string } => Boolean(t.id));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("restaurant_tables").insert(toInsert);
    if (error) return { error: error.message };
  }

  for (const table of toUpdate) {
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ table_number: table.table_number, seats: table.seats, pos_x: table.pos_x, pos_y: table.pos_y })
      .eq("id", table.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/mesas");
  return { error: null };
}

export async function deleteTableAction(tableId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("restaurant_tables").delete().eq("id", tableId);
  revalidatePath("/mesas");
}

/** Asigna (o desasigna, con tableId null) una reserva a una mesa específica. */
export async function assignReservationAction(reservationId: string, tableId: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("table_reservations")
    .update({ table_id: tableId, status: tableId ? "asignada" : "pendiente" })
    .eq("id", reservationId);
  if (error) throw error;
  revalidatePath("/mesas");
}

export async function updateReservationStatusAction(reservationId: string, status: ReservationStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("table_reservations").update({ status }).eq("id", reservationId);
  if (error) throw error;
  revalidatePath("/mesas");
}

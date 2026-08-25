"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { propertyFormSchema } from "@/lib/validation";
import type { PropertyStatus } from "@/types/database";

export interface PropertyActionState {
  error: string | null;
  success: string | null;
}

async function uploadPhotoIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicId: string,
  file: File | null
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const path = `${clinicId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function createPropertyAction(
  _prevState: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("id").single();
  if (!clinic) return { error: "No se encontró el negocio.", success: null };

  const priceRaw = formData.get("price");
  const parsed = propertyFormSchema.safeParse({
    title: formData.get("title"),
    address: formData.get("address"),
    price: priceRaw ? Number(priceRaw) : 0,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", success: null };
  }

  let photoUrl: string | null = null;
  try {
    const file = formData.get("photo") as File | null;
    photoUrl = await uploadPhotoIfPresent(supabase, clinic.id, file);
  } catch (err) {
    console.error("Error subiendo la foto de la propiedad:", err);
    return { error: "No se pudo subir la foto. Probá de nuevo.", success: null };
  }

  const { error } = await supabase.from("properties").insert({
    clinic_id: clinic.id,
    title: parsed.data.title,
    address: parsed.data.address,
    price: parsed.data.price,
    description: parsed.data.description ?? null,
    photo_url: photoUrl,
  });
  if (error) return { error: error.message, success: null };

  revalidatePath("/propiedades");
  return { error: null, success: "Propiedad agregada." };
}

export async function deletePropertyAction(propertyId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("properties").delete().eq("id", propertyId);
  revalidatePath("/propiedades");
}

export async function updatePropertyStatusAction(propertyId: string, status: PropertyStatus): Promise<void> {
  const supabase = await createClient();
  await supabase.from("properties").update({ status }).eq("id", propertyId);
  revalidatePath("/propiedades");
}

export async function updateVisitStatusAction(visitId: string, status: "pendiente" | "confirmada" | "cancelada"): Promise<void> {
  const supabase = await createClient();
  await supabase.from("property_visits").update({ status }).eq("id", visitId);
  revalidatePath("/propiedades");
}

import { verify } from "retell-sdk";
import { NextResponse, type NextRequest } from "next/server";

import { getTenantRetellApiKey } from "@/lib/retell/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPersonalizedFirstMessage } from "@/lib/vapi/personalization";
import { buildFirstMessage } from "@/lib/vapi/promptBuilder";
import { retellCallEventSchema, retellInboundWebhookSchema } from "@/lib/validation";
import type { AgentConfig, Clinic } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminClient>;

// Retell exige responder "call_inbound" rápido (es el equivalente al
// assistant-request de VAPI, bloquea el arranque de la llamada real). Si la
// búsqueda de cliente recurrente tarda de más, usamos el saludo genérico en
// vez de arriesgar que Retell tire el timeout.
const GREETING_TIMEOUT_MS = 2500;

async function buildGreetingWithTimeout(
  admin: AdminClient,
  clinic: Clinic,
  config: AgentConfig,
  customerNumber: string | undefined
): Promise<string> {
  const fallback = buildFirstMessage(config, clinic);
  const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(fallback), GREETING_TIMEOUT_MS));
  return Promise.race([buildPersonalizedFirstMessage(admin, clinic, config, customerNumber), timeout]);
}

/**
 * Verifica la firma HMAC del webhook usando la propia clave de Retell del
 * negocio dueño de esta llamada/número (cada negocio conecta su propia
 * cuenta — a diferencia de VAPI, no hay un único secreto compartido).
 */
async function verifyClinicSignature(admin: AdminClient, clinicId: string, rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const apiKey = await getTenantRetellApiKey(clinicId, admin);
  if (!apiKey) return false;
  return verify(rawBody, apiKey, signature);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature");

  const parsedJson = (() => {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  })();

  if (!parsedJson) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  // "call_inbound": llega una vez al inicio de cada llamada entrante (el
  // número no tiene un agente fijo, ver lib/retell/sync.ts) para poder
  // devolver un saludo personalizado por número que llama.
  if (parsedJson.event === "call_inbound") {
    const parsed = retellInboundWebhookSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    const toNumber = parsed.data.call_inbound.to_number;
    if (!toNumber) {
      return NextResponse.json({ error: "missing_phone_number" }, { status: 400 });
    }

    const { data: config } = await admin.from("agent_configs").select("*").eq("retell_phone_number", toNumber).maybeSingle();
    if (!config) {
      return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
    }

    const isValid = await verifyClinicSignature(admin, config.clinic_id, rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // El número no tiene inbound_agents fijo (ver lib/retell/sync.ts), así que
    // sin override_agent_id acá Retell no sabría qué agente atender la
    // llamada — a diferencia de un número con agente fijo, donde este campo
    // es opcional.
    if (!config.retell_agent_id) {
      console.error(`Retell call_inbound: el negocio ${config.clinic_id} todavía no publicó su asistente.`);
      return NextResponse.json({ call_inbound: { reject: true } });
    }

    const { data: clinic } = await admin.from("clinics").select("*").eq("id", config.clinic_id).single();
    if (!clinic) {
      return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
    }

    try {
      const greeting = await buildGreetingWithTimeout(admin, clinic, config, parsed.data.call_inbound.from_number);
      return NextResponse.json({ call_inbound: { override_agent_id: config.retell_agent_id, dynamic_variables: { greeting } } });
    } catch (err) {
      console.error("Error armando el saludo dinámico de Retell:", err);
      // Red de seguridad: sin dynamic_variables, Retell usa
      // default_dynamic_variables (el saludo genérico ya guardado en el LLM).
      return NextResponse.json({ call_inbound: { override_agent_id: config.retell_agent_id } });
    }
  }

  // Eventos de ciclo de vida de la llamada: call_started / call_ended / call_analyzed.
  const parsed = retellCallEventSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json({});
  }
  const { call } = parsed.data;
  if (!call.agent_id) {
    return NextResponse.json({ error: "missing_agent" }, { status: 400 });
  }

  const { data: config } = await admin.from("agent_configs").select("clinic_id").eq("retell_agent_id", call.agent_id).maybeSingle();
  if (!config) {
    return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
  }

  const isValid = await verifyClinicSignature(admin, config.clinic_id, rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const customerNumber = call.direction === "outbound" ? (call.to_number ?? null) : (call.from_number ?? null);

  // Upsert por retell_call_id: cualquiera de los 3 eventos puede llegar
  // primero según latencia de red, así que cada uno completa los campos que
  // trae sin depender de que la fila ya exista.
  const { data: callRow, error: upsertError } = await admin
    .from("calls")
    .upsert(
      {
        clinic_id: config.clinic_id,
        retell_call_id: call.call_id,
        phone_number: customerNumber,
        started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : undefined,
        ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : undefined,
        status: call.disconnection_reason ?? undefined,
        summary: call.call_analysis?.call_summary ?? undefined,
        cost: call.call_cost?.combined_cost != null ? call.call_cost.combined_cost / 100 : undefined,
        recording_url: call.recording_url ?? undefined,
      },
      { onConflict: "retell_call_id" }
    )
    .select("id")
    .single();

  if (upsertError) {
    console.error("Error guardando la llamada de Retell:", upsertError);
    return NextResponse.json({});
  }

  if (parsed.data.event === "call_analyzed" && call.transcript && callRow) {
    await admin.from("transcripts").insert({
      clinic_id: config.clinic_id,
      call_id: callRow.id,
      full_transcript: call.transcript,
    });
  }

  return NextResponse.json({});
}

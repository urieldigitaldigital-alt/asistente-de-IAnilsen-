import { verify } from "retell-sdk";
import { NextResponse, type NextRequest } from "next/server";

import { getTenantRetellApiKey } from "@/lib/retell/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToolCall, type ToolHandlerContext } from "@/lib/vapi/toolHandlers";
import { retellToolCallSchema } from "@/lib/validation";

/**
 * Retell manda un POST por cada tool invocada durante la llamada (no las
 * agrupa como VAPI). Todas las tools de dominio (checkAvailability,
 * createOrder, etc.) apuntan acá — ver lib/retell/tools.ts.
 */
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
    return new NextResponse("Payload inválido.", { status: 400 });
  }

  const parsed = retellToolCallSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return new NextResponse("Payload inválido.", { status: 400 });
  }
  const { name, args, call } = parsed.data;
  if (!call.agent_id) {
    return new NextResponse("Falta el agente de la llamada.", { status: 400 });
  }

  const admin = createAdminClient();

  const { data: config } = await admin.from("agent_configs").select("*").eq("retell_agent_id", call.agent_id).maybeSingle();
  if (!config) {
    return new NextResponse("Negocio no encontrado.", { status: 404 });
  }

  const apiKey = await getTenantRetellApiKey(config.clinic_id, admin);
  const isValid = apiKey && signature ? await verify(rawBody, apiKey, signature) : false;
  if (!isValid) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const { data: clinic } = await admin.from("clinics").select("*").eq("id", config.clinic_id).single();
  if (!clinic) {
    return new NextResponse("Negocio no encontrado.", { status: 404 });
  }

  let callRowId: string | null = null;
  if (call.call_id) {
    const { data: callRow } = await admin.from("calls").select("id").eq("retell_call_id", call.call_id).maybeSingle();
    callRowId = callRow?.id ?? null;
  }

  const ctx: ToolHandlerContext = { admin, clinic, config, callRowId };
  const result = await dispatchToolCall(ctx, name, args ?? {}).catch((err: unknown) => {
    console.error(`Error ejecutando la tool "${name}":`, err);
    return "Ocurrió un error interno al procesar la solicitud.";
  });

  return new NextResponse(result, { status: 200, headers: { "Content-Type": "text/plain" } });
}

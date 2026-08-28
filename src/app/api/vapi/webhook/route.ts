import { NextResponse, type NextRequest } from "next/server";

import { constantTimeEqual } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPersonalizedFirstMessage } from "@/lib/vapi/personalization";
import { buildFirstMessage } from "@/lib/vapi/promptBuilder";
import { buildAssistantPayload } from "@/lib/vapi/sync";
import { dispatchToolCall } from "@/lib/vapi/toolHandlers";
import { vapiWebhookMessageSchema } from "@/lib/validation";

// VAPI exige responder assistant-request en 7.5s totales (incluye el viaje de
// red) o la llamada falla con "assistant-request-returned-error" — confirmado
// en producción para números con poco tráfico (función fría). Si la búsqueda
// de "cliente recurrente" (para personalizar el saludo) tarda de más,
// preferimos contestar con el saludo genérico antes que arriesgar ese timeout.
const GREETING_TIMEOUT_MS = 2500;

async function buildGreetingWithTimeout(
  admin: ReturnType<typeof createAdminClient>,
  clinic: Parameters<typeof buildPersonalizedFirstMessage>[1],
  config: Parameters<typeof buildPersonalizedFirstMessage>[2],
  customerNumber: string | undefined
): Promise<string> {
  const fallback = buildFirstMessage(config, clinic);
  const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(fallback), GREETING_TIMEOUT_MS));
  return Promise.race([buildPersonalizedFirstMessage(admin, clinic, config, customerNumber), timeout]);
}

function parseFunctionArguments(args: string | Record<string, unknown> | undefined): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      return JSON.parse(args) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return args;
}

export async function POST(request: NextRequest) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const incomingSecret = request.headers.get("x-webhook-secret");
  if (!secret || !incomingSecret || !constantTimeEqual(incomingSecret, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsedBody = vapiWebhookMessageSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    // Log temporal: VAPI manda mensajes de tipos que todavía no soportamos
    // (ej. artefactos de debugging cuando algo falla armando el assistant) y
    // hoy los descartamos en silencio sin poder ver qué contienen.
    console.error("Payload de VAPI no reconocido:", JSON.stringify(rawBody)?.slice(0, 4000));
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { message } = parsedBody.data;
  if (message.type !== "tool-calls" && message.type !== "status-update" && message.type !== "transcript") {
    console.error(`VAPI webhook: ${message.type}`, JSON.stringify(rawBody)?.slice(0, 4000));
  }
  const admin = createAdminClient();

  // Llega una vez al inicio de cada llamada entrante (el número no tiene un
  // assistantId fijo, ver lib/vapi/sync.ts): arma el assistant al vuelo con
  // un saludo personalizado si el número que llama ya pidió/agendó antes.
  if (message.type === "assistant-request") {
    const requestPhoneNumberId = message.call?.phoneNumber?.id ?? message.call?.phoneNumberId;
    if (!requestPhoneNumberId) {
      return NextResponse.json({ error: "missing_phone_number" }, { status: 400 });
    }

    const { data: config } = await admin
      .from("agent_configs")
      .select("*")
      .eq("vapi_phone_number_id", requestPhoneNumberId)
      .maybeSingle();
    if (!config) {
      return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
    }
    const { data: clinic } = await admin.from("clinics").select("*").eq("id", config.clinic_id).single();
    if (!clinic) {
      return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
    }

    try {
      const greeting = await buildGreetingWithTimeout(admin, clinic, config, message.call?.customer?.number ?? undefined);
      const assistant = buildAssistantPayload(clinic, config, greeting);
      return NextResponse.json({ assistant });
    } catch (err) {
      console.error("Error armando el assistant dinámico:", err);
      // Red de seguridad: si algo falla armando el saludo personalizado, la
      // llamada igual se contesta con el assistant publicado normal.
      if (config.vapi_assistant_id) {
        return NextResponse.json({ assistantId: config.vapi_assistant_id });
      }
      return NextResponse.json({ error: "assistant_not_ready" }, { status: 500 });
    }
  }

  // Los números ya no tienen assistantId fijo (ver assistant-request arriba),
  // así que `call.phoneNumberId` (plano) puede venir vacío en estos eventos;
  // `call.phoneNumber.id` (anidado) es el que sí viene siempre poblado.
  const phoneNumberId = message.call?.phoneNumberId ?? message.call?.phoneNumber?.id;
  // Para tool-calls disparados desde WhatsApp (Chat API) no hay `call`, solo `chat`.
  const assistantId = message.call?.assistantId ?? message.chat?.assistantId;
  const vapiCallId = message.call?.id;
  const customerNumber = message.call?.customer?.number ?? null;

  if (!phoneNumberId && !assistantId) {
    console.error("Webhook sin contexto de llamada:", message.type, JSON.stringify(message.call ?? message.chat ?? {}));
    return NextResponse.json({ error: "missing_call_context" }, { status: 400 });
  }

  const configQuery = phoneNumberId
    ? admin.from("agent_configs").select("*").eq("vapi_phone_number_id", phoneNumberId)
    : admin.from("agent_configs").select("*").eq("vapi_assistant_id", assistantId!);
  const { data: config } = await configQuery.maybeSingle();
  if (!config) {
    return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
  }

  const { data: clinic } = await admin.from("clinics").select("*").eq("id", config.clinic_id).single();
  if (!clinic) {
    return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
  }

  let callRowId: string | null = null;
  if (vapiCallId) {
    const { data: callRow } = await admin
      .from("calls")
      .upsert(
        { clinic_id: clinic.id, vapi_call_id: vapiCallId, phone_number: customerNumber },
        { onConflict: "vapi_call_id" }
      )
      .select("id")
      .single();
    callRowId = callRow?.id ?? null;
  }

  const ctx = { admin, clinic, config, callRowId };

  switch (message.type) {
    case "tool-calls": {
      const toolCalls = message.toolCallList ?? message.toolCalls ?? [];
      const results = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const name = toolCall.name ?? toolCall.function?.name ?? "";
          const rawArgs = toolCall.parameters ?? toolCall.arguments ?? parseFunctionArguments(toolCall.function?.arguments ?? undefined);
          const result = await dispatchToolCall(ctx, name, rawArgs).catch((err: unknown) => {
            console.error(`Error ejecutando la tool "${name}":`, err);
            return "Ocurrió un error interno al procesar la solicitud.";
          });
          return { toolCallId: toolCall.id, result };
        })
      );
      return NextResponse.json({ results });
    }

    case "end-of-call-report": {
      if (vapiCallId) {
        await admin
          .from("calls")
          .update({
            started_at: message.startedAt ?? null,
            ended_at: message.endedAt ?? null,
            status: message.endedReason ?? "ended",
            summary: message.analysis?.summary ?? null,
            cost: message.cost ?? null,
          })
          .eq("vapi_call_id", vapiCallId);
      }

      if (callRowId) {
        const fullTranscript = message.artifact?.transcript ?? null;
        const turns = message.artifact?.messages ?? [];

        const rows = [
          ...(fullTranscript ? [{ clinic_id: clinic.id, call_id: callRowId, full_transcript: fullTranscript }] : []),
          ...turns
            .filter((turn) => turn.role === "assistant" || turn.role === "user")
            .map((turn) => ({
              clinic_id: clinic.id,
              call_id: callRowId as string,
              role: turn.role as "assistant" | "user",
              text: turn.message ?? "",
            })),
        ];

        if (rows.length > 0) {
          await admin.from("transcripts").insert(rows);
        }
      }

      return NextResponse.json({});
    }

    default:
      return NextResponse.json({});
  }
}

import { NextResponse, type NextRequest } from "next/server";

import { constantTimeEqual } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchToolCall } from "@/lib/vapi/toolHandlers";
import { vapiWebhookMessageSchema } from "@/lib/validation";

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
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { message } = parsedBody.data;

  const phoneNumberId = message.call?.phoneNumberId;
  const assistantId = message.call?.assistantId;
  const vapiCallId = message.call?.id;
  const customerNumber = message.call?.customer?.number ?? null;

  if (!phoneNumberId && !assistantId) {
    return NextResponse.json({ error: "missing_call_context" }, { status: 400 });
  }

  const admin = createAdminClient();

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
          const rawArgs = toolCall.parameters ?? toolCall.arguments ?? parseFunctionArguments(toolCall.function?.arguments);
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

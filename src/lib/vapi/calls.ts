import type { SupabaseClient } from "@supabase/supabase-js";

import { getTenantVapiClient } from "@/lib/vapi/credentials";
import type { Database } from "@/types/database";

export interface OrderReadyCallParams {
  clinicId: string;
  clinicName: string;
  vapiPhoneNumberId: string;
  vapiAssistantId: string;
  customerName: string;
  customerPhone: string;
  orderNumber: number;
}

/**
 * Llama por teléfono al cliente para avisarle que su pedido está listo para
 * retirar — solo para pickup, un envío ya se lleva solo. Usa un prompt
 * mínimo y transitorio (no el asistente completo de toma de pedidos): la
 * única tarea de esta llamada es avisar, no tomar pedidos nuevos.
 */
export async function callCustomerOrderReady(supabase: SupabaseClient<Database>, params: OrderReadyCallParams): Promise<void> {
  const vapi = await getTenantVapiClient(params.clinicId, supabase);
  const firstName = params.customerName.trim().split(/\s+/)[0] || params.customerName;

  await vapi.calls.create({
    assistantId: params.vapiAssistantId,
    phoneNumberId: params.vapiPhoneNumberId,
    customer: { number: params.customerPhone, name: params.customerName },
    assistantOverrides: {
      firstMessage: `¡Hola ${firstName}! Te llamamos de ${params.clinicName} para avisarte que tu pedido número ${params.orderNumber} ya está listo para retirar.`,
      endCallMessage: "¡Gracias, te esperamos!",
      maxDurationSeconds: 90,
      model: {
        provider: "openai",
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `Sos el asistente de ${params.clinicName}. Esta es una llamada saliente automática, no una llamada entrante: tu única tarea es avisarle a ${firstName} que su pedido número ${params.orderNumber} ya está listo para retirar en el local. Si confirma o agradece, despedite brevemente en una sola frase. Si pregunta algo simple (horario, dirección), respondé brevemente con lo que sepas. No tomes pedidos nuevos ni agendes nada — si quiere pedir algo más, decile que te llame o escriba de nuevo más tarde. Sé breve, natural y con acento argentino, una o dos frases por turno.`,
          },
        ],
      },
    },
  });
}

export interface OutboundLead {
  name: string;
  phone: string;
}

export interface LaunchOutboundCampaignParams {
  clinicId: string;
  clinicName: string;
  vapiPhoneNumberId: string;
  vapiAssistantId: string;
  leads: OutboundLead[];
}

/**
 * Llamadas salientes en tanda a una lista de leads/contactos cargados a mano
 * por el dueño del negocio (panel de CRM). Usa la Campaigns API nativa de
 * VAPI en vez de disparar `calls.create` en un loop propio: VAPI encola,
 * respeta el límite de concurrencia de la org, y reintenta durante hasta 1
 * hora los que no entraron por capacidad — no hay que reimplementar nada de
 * eso acá. No reemplaza el prompt del asistente — usa el system_prompt ya
 * publicado (la presentación comercial configurada en Personalización), solo
 * personaliza el saludo por nombre.
 */
export async function launchOutboundCallCampaign(
  supabase: SupabaseClient<Database>,
  params: LaunchOutboundCampaignParams
): Promise<{ campaignId: string }> {
  const vapi = await getTenantVapiClient(params.clinicId, supabase);

  const customers = params.leads.map((lead) => {
    const firstName = lead.name.trim().split(/\s+/)[0] || "";
    return {
      number: lead.phone,
      name: lead.name || undefined,
      assistantOverrides: {
        firstMessage: firstName
          ? `¡Hola ${firstName}! Te llamamos de ${params.clinicName}, ¿tenés un minuto?`
          : `¡Hola! Te llamamos de ${params.clinicName}, ¿tenés un minuto?`,
        maxDurationSeconds: 300,
      },
    };
  });

  const campaign = await vapi.campaigns.campaignControllerCreate({
    name: `CRM — ${new Date().toISOString()}`,
    assistantId: params.vapiAssistantId,
    phoneNumberId: params.vapiPhoneNumberId,
    customers,
  });

  return { campaignId: campaign.id };
}

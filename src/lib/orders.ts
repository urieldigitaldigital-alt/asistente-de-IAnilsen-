import type { SupabaseClient } from "@supabase/supabase-js";

import { callCustomerOrderReady } from "@/lib/vapi/calls";
import { getOwnWhatsappCredentials } from "@/lib/whatsapp/credentials";
import { getOrCreateWhatsappSession } from "@/lib/whatsapp/chat";
import { sendWhatsAppMessage } from "@/lib/whatsapp/meta";
import { logWhatsappMessage } from "@/lib/whatsapp/messages";
import type { Database, OrderStatus } from "@/types/database";

interface ReadyOrder {
  clinic_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  order_type: string;
}

/**
 * Avisa por WhatsApp al cliente que su pedido está listo — solo para pedidos
 * que se originaron por WhatsApp (call_id null); los de llamada telefónica no
 * tienen un hilo de WhatsApp al que mandarle nada. Nunca debe romper el
 * cambio de estado del pedido si el envío falla.
 */
async function notifyOrderReadyByWhatsApp(supabase: SupabaseClient<Database>, order: ReadyOrder): Promise<void> {
  try {
    const credentials = await getOwnWhatsappCredentials(order.clinic_id, supabase);
    if (!credentials) return;

    const { data: clinic } = await supabase.from("clinics").select("name").eq("id", order.clinic_id).single();
    const clinicName = clinic?.name ?? "el local";

    const body =
      order.order_type === "delivery"
        ? `¡Hola ${order.customer_name}! Tu pedido #${order.order_number} de ${clinicName} ya está listo y en camino. 🎉`
        : `¡Hola ${order.customer_name}! Tu pedido #${order.order_number} de ${clinicName} ya está listo para retirar. ¡Te esperamos! 🎉`;

    await sendWhatsAppMessage({
      phoneNumberId: credentials.metaPhoneNumberId,
      accessToken: credentials.metaAccessToken,
      to: order.customer_phone,
      body,
    });

    const session = await getOrCreateWhatsappSession({ clinicId: order.clinic_id, customerPhone: order.customer_phone, admin: supabase });
    await logWhatsappMessage(supabase, { clinicId: order.clinic_id, sessionId: session.id, role: "business", body });
  } catch (err) {
    console.error("No se pudo avisar por WhatsApp que el pedido está listo:", err);
  }
}

/**
 * Llama por teléfono al cliente para avisarle que su pedido está listo —
 * solo para pickup (un envío se lleva solo, no hace falta avisar así).
 * Aplica sin importar el canal de origen del pedido. Nunca debe romper el
 * cambio de estado del pedido si la llamada falla.
 */
async function notifyOrderReadyByPhoneCall(supabase: SupabaseClient<Database>, order: ReadyOrder): Promise<void> {
  try {
    const { data: clinic } = await supabase.from("clinics").select("id, name").eq("id", order.clinic_id).single();
    if (!clinic) return;

    const { data: config } = await supabase
      .from("agent_configs")
      .select("vapi_phone_number_id, vapi_assistant_id")
      .eq("clinic_id", order.clinic_id)
      .single();
    if (!config?.vapi_phone_number_id || !config?.vapi_assistant_id) return;

    await callCustomerOrderReady(supabase, {
      clinicId: clinic.id,
      clinicName: clinic.name,
      vapiPhoneNumberId: config.vapi_phone_number_id,
      vapiAssistantId: config.vapi_assistant_id,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      orderNumber: order.order_number,
    });
  } catch (err) {
    console.error("No se pudo llamar al cliente para avisar que el pedido está listo:", err);
  }
}

/** Cambia el estado de un pedido (usado desde el panel, respeta RLS) y avisa que quedó "listo" por WhatsApp y/o llamada. */
export async function updateOrderStatus(
  supabase: SupabaseClient<Database>,
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("clinic_id, call_id, order_number, customer_name, customer_phone, order_type")
    .single();
  if (error) throw error;

  if (status !== "listo") return;

  if (!order.call_id) {
    await notifyOrderReadyByWhatsApp(supabase, order);
  }
  if (order.order_type === "pickup") {
    await notifyOrderReadyByPhoneCall(supabase, order);
  }
}

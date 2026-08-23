"use client";

import { ChatsCircleIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { updateWhatsappStatusAction } from "@/actions/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { WhatsappConversationStatus, WhatsappMessage, WhatsappSession } from "@/types/database";

const STATUS_CONFIG: Record<WhatsappConversationStatus, { label: string; tone: "neutral" | "warning" | "success" }> = {
  active: { label: "Activa", tone: "neutral" },
  needs_follow_up: { label: "Necesita seguimiento", tone: "warning" },
  resolved: { label: "Resuelta", tone: "success" },
};

function formatTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();
  return isToday
    ? new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(date)
    : new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone }).format(date);
}

export function WhatsAppInbox({
  clinicId,
  timeZone,
  initialConversations,
}: {
  clinicId: string;
  timeZone: string;
  initialConversations: WhatsappSession[];
}) {
  const [conversations, setConversations] = useState<WhatsappSession[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [isPending, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  // Escucha nuevas conversaciones / cambios de estado o de último mensaje, en vivo.
  useEffect(() => {
    const channel = supabase
      .channel(`whatsapp_sessions_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_sessions", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as WhatsappSession | undefined;
          if (!row?.id) return;
          setConversations((prev) => {
            const withoutRow = prev.filter((c) => c.id !== row.id);
            return [row, ...withoutRow].sort(
              (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, clinicId]);

  // Trae los mensajes de la conversación seleccionada y escucha los nuevos en vivo.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("session_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setMessages(data ?? []);
      });

    const channel = supabase
      .channel(`whatsapp_messages_${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `session_id=eq.${selectedId}` },
        (payload) => {
          const row = payload.new as WhatsappMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const handleStatusChange = (status: WhatsappConversationStatus) => {
    if (!selectedId) return;
    setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, status } : c)));
    startTransition(() => {
      updateWhatsappStatusAction(selectedId, status);
    });
  };

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={ChatsCircleIcon}
        title="Todavía no hay conversaciones de WhatsApp"
        description="En cuanto un cliente te escriba, la conversación va a aparecer acá en vivo."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="w-full max-w-xs shrink-0 overflow-y-auto border-r border-border">
        {conversations.map((conversation) => {
          const config = STATUS_CONFIG[conversation.status];
          const active = conversation.id === selectedId;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left text-sm ${
                active ? "bg-primary/10" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{conversation.customer_name || conversation.customer_phone}</span>
                <span className="shrink-0 text-xs text-muted">{formatTime(conversation.last_message_at, timeZone)}</span>
              </div>
              <Badge tone={config.tone}>{config.label}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{selected.customer_name || selected.customer_phone}</p>
                <p className="text-xs text-muted">{selected.customer_phone}</p>
              </div>
              <select
                value={selected.status}
                disabled={isPending}
                onChange={(e) => handleStatusChange(e.target.value as WhatsappConversationStatus)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "customer" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                      message.role === "customer" ? "bg-primary/10" : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    <p className="mb-0.5 text-[11px] font-medium text-muted">
                      {message.role === "customer" ? "Cliente" : "Asistente"}
                    </p>
                    {message.body}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
            Elegí una conversación de la izquierda.
          </div>
        )}
      </div>
    </div>
  );
}

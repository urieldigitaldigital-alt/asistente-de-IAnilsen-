"use client";

import { ChatsCircleIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { sendWhatsappReplyAction, updateWhatsappStatusAction } from "@/actions/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { WhatsappConversationStatus, WhatsappMessage, WhatsappSession } from "@/types/database";

const STATUS_CONFIG: Record<WhatsappConversationStatus, { label: string; tone: "neutral" | "warning" | "success" }> = {
  active: { label: "Activa", tone: "neutral" },
  needs_follow_up: { label: "Necesita seguimiento", tone: "warning" },
  resolved: { label: "Resuelta", tone: "success" },
};

const ROLE_LABEL: Record<WhatsappMessage["role"], string> = {
  customer: "Cliente",
  assistant: "Asistente",
  business: "Vos",
};

function formatTime(iso: string, timeZone: string): string {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();
  return isToday
    ? new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(date)
    : new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone }).format(date);
}

function formatBubbleTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Avatar({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-9 w-9 text-sm" : "h-10 w-10 text-base";
  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full bg-[#0f766e] font-semibold text-white dark:bg-[#2dd4bf] dark:text-[#0b1120]`}
    >
      {initialOf(label)}
    </div>
  );
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
  const [replyText, setReplyText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Baja al último mensaje cuando cambia la conversación o llega uno nuevo.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [selectedId, messages.length]);

  useEffect(() => {
    setReplyText("");
    setSendError(null);
  }, [selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const handleStatusChange = (status: WhatsappConversationStatus) => {
    if (!selectedId) return;
    setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, status } : c)));
    startTransition(() => {
      updateWhatsappStatusAction(selectedId, status);
    });
  };

  const handleSend = () => {
    const body = replyText.trim();
    if (!body || !selectedId || isSending) return;
    setSendError(null);
    startSending(async () => {
      const result = await sendWhatsappReplyAction(selectedId, body);
      if (result.error) {
        setSendError(result.error);
        return;
      }
      setReplyText("");
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
          const label = conversation.customer_name || conversation.customer_phone;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm ${
                active ? "bg-primary/10" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <Avatar label={label} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{label}</span>
                  <span className="shrink-0 text-xs text-muted">{formatTime(conversation.last_message_at, timeZone)}</span>
                </div>
                <Badge tone={config.tone}>{config.label}</Badge>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar label={selected.customer_name || selected.customer_phone} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{selected.customer_name || selected.customer_phone}</p>
                  <p className="text-xs text-muted">{selected.customer_phone}</p>
                </div>
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

            <div className="flex-1 space-y-1.5 overflow-y-auto bg-[#e5ddd5] p-4 dark:bg-[#0b141a]">
              {messages.map((message) => {
                const outgoing = message.role !== "customer";
                return (
                  <div key={message.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
                        outgoing
                          ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]"
                          : "rounded-tl-none bg-white text-[#111b21] dark:bg-[#1f2c34] dark:text-[#e9edef]"
                      }`}
                    >
                      {message.role === "business" ? (
                        <p className="mb-0.5 text-[11px] font-semibold text-primary">{ROLE_LABEL[message.role]}</p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                      <p className="mt-0.5 text-right text-[10px] opacity-60">{formatBubbleTime(message.created_at, timeZone)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border bg-surface p-3">
              {sendError ? <p className="mb-2 text-xs text-danger">{sendError}</p> : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isSending}
                  rows={1}
                  placeholder="Escribí un mensaje"
                  className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !replyText.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
                  aria-label="Enviar mensaje"
                >
                  <PaperPlaneRightIcon size={18} weight="fill" />
                </button>
              </div>
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

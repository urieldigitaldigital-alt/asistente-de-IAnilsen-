"use client";

import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { sendSandboxMessageAction } from "@/actions/sandboxChat";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface SandboxMessage {
  role: "user" | "assistant";
  content: string;
}

export function SandboxChat({ systemPrompt, modelName }: { systemPrompt: string; modelName: string }) {
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setError(null);

    startTransition(async () => {
      const result = await sendSandboxMessageAction(systemPrompt, modelName, text, chatId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setChatId(result.chatId);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    });
  };

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Probar</h2>
        <p className="text-xs text-muted">
          Sandbox de chat con el prompt actual (sin guardar), sin tools ni llamadas reales.
        </p>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
        {messages.length === 0 && <p className="text-sm text-muted">Escribe un mensaje para probar el prompt.</p>}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                message.role === "assistant" ? "bg-black/5 dark:bg-white/10" : "bg-primary/10"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isPending && <p className="text-xs text-muted">Escribiendo…</p>}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Hola, quisiera agendar una cita…"
        />
        <Button type="button" onClick={send} disabled={isPending}>
          <PaperPlaneRightIcon size={16} />
        </Button>
      </div>
    </Card>
  );
}

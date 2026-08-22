import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

interface PromptEditorProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  tone: string;
  onToneChange: (value: string) => void;
  firstMessage: string;
  onFirstMessageChange: (value: string) => void;
  handoffMessage: string;
  onHandoffMessageChange: (value: string) => void;
}

export function PromptEditor({
  systemPrompt,
  onSystemPromptChange,
  tone,
  onToneChange,
  firstMessage,
  onFirstMessageChange,
  handoffMessage,
  onHandoffMessageChange,
}: PromptEditorProps) {
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Prompt y tono</h2>
      <div>
        <Label htmlFor="system_prompt">Identidad y guardrails del asistente</Label>
        <textarea
          id="system_prompt"
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted">
          Los tratamientos, horarios y políticas configurados abajo se agregan automáticamente al prompt final.
        </p>
      </div>
      <div>
        <Label htmlFor="tone">Tono</Label>
        <Input id="tone" value={tone} onChange={(e) => onToneChange(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="first_message">Mensaje de bienvenida (firstMessage)</Label>
        <textarea
          id="first_message"
          value={firstMessage}
          onChange={(e) => onFirstMessageChange(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <Label htmlFor="handoff_message">Mensaje de transferencia a recepción</Label>
        <Input id="handoff_message" value={handoffMessage} onChange={(e) => onHandoffMessageChange(e.target.value)} />
      </div>
    </Card>
  );
}

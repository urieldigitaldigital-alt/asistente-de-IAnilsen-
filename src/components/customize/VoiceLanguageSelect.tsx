"use client";

import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

const AZURE_SPANISH_VOICES = [
  { id: "es-MX-DaliaNeural", label: "Dalia (es-MX, mujer)" },
  { id: "es-MX-JorgeNeural", label: "Jorge (es-MX, hombre)" },
  { id: "es-ES-ElviraNeural", label: "Elvira (es-ES, mujer)" },
  { id: "es-ES-AlvaroNeural", label: "Álvaro (es-ES, hombre)" },
  { id: "es-AR-ElenaNeural", label: "Elena (es-AR, mujer)" },
  { id: "es-AR-TomasNeural", label: "Tomás (es-AR, hombre)" },
];

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
];

interface VoiceLanguageSelectProps {
  voiceId: string;
  onVoiceIdChange: (value: string) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  modelName: string;
  onModelNameChange: (value: string) => void;
}

export function VoiceLanguageSelect({
  voiceId,
  onVoiceIdChange,
  language,
  onLanguageChange,
  modelName,
  onModelNameChange,
}: VoiceLanguageSelectProps) {
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Voz, idioma y modelo</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="voice_id">Voz (Azure)</Label>
          <select
            id="voice_id"
            value={voiceId}
            onChange={(e) => onVoiceIdChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {AZURE_SPANISH_VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="language">Idioma de la transcripción</Label>
          <select
            id="language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="model_name">Modelo (OpenAI)</Label>
          <Input id="model_name" value={modelName} onChange={(e) => onModelNameChange(e.target.value)} placeholder="gpt-4.1" />
        </div>
      </div>
    </Card>
  );
}

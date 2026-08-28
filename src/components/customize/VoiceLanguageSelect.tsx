"use client";

import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";

// Voces reales de Retell (confirmadas contra client.voice.list() con una API
// key real) — no hay acento "argentino" en el catálogo, así que usamos
// México/España como las variantes de español más cercanas disponibles.
// Todas están incluidas en la cuenta de Retell del negocio, sin necesidad de
// conectar ElevenLabs/Cartesia por separado (Retell las expone directo).
const RETELL_VOICES = [
  { id: "retell-Andrea", label: "Andrea (mujer, México)" },
  { id: "retell-Gaby", label: "Gaby (mujer joven, México)" },
  { id: "retell-Claudia", label: "Claudia (mujer, México)" },
  { id: "retell-Alejandro", label: "Alejandro (hombre joven, México)" },
  { id: "cartesia-Hailey-Spanish-latin-america", label: "Hailey (mujer joven, Latinoamérica)" },
  { id: "cartesia-Isabel", label: "Isabel (mujer, España)" },
  { id: "cartesia-Elena", label: "Elena (mujer, España)" },
  { id: "cartesia-Manuel", label: "Manuel (hombre, España)" },
];
const CUSTOM_VOICE_VALUE = "__custom__";

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
];

// Rango documentado por Retell para voice_speed: [0.5, 2] (confirmado contra
// el SDK, no asumido — VAPI/ElevenLabs tenían un rango distinto y más chico).
const SPEED_OPTIONS = [
  { value: 0.7, label: "Más lento (0.7x)" },
  { value: 0.9, label: "Un poco más lento (0.9x)" },
  { value: 1, label: "Normal (1x)" },
  { value: 1.15, label: "Un poco más rápido (1.15x)" },
  { value: 1.3, label: "Rápido (1.3x)" },
  { value: 1.6, label: "Muy rápido (1.6x)" },
  { value: 2, label: "Máximo (2x)" },
];

interface VoiceLanguageSelectProps {
  voiceId: string;
  onVoiceIdChange: (value: string) => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  modelName: string;
  onModelNameChange: (value: string) => void;
}

export function VoiceLanguageSelect({
  voiceId,
  onVoiceIdChange,
  speed,
  onSpeedChange,
  language,
  onLanguageChange,
  modelName,
  onModelNameChange,
}: VoiceLanguageSelectProps) {
  const preset = RETELL_VOICES.find((v) => v.id === voiceId);
  const selectValue = !preset ? CUSTOM_VOICE_VALUE : preset.id;

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Voz, idioma y modelo</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="voice_id">Voz</Label>
          <select
            id="voice_id"
            value={selectValue}
            onChange={(e) => {
              const next = e.target.value;
              onVoiceIdChange(next === CUSTOM_VOICE_VALUE ? "" : next);
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {RETELL_VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
            <option value={CUSTOM_VOICE_VALUE}>Otra (pegar Voice ID de Retell)…</option>
          </select>
          {selectValue === CUSTOM_VOICE_VALUE && (
            <Input
              className="mt-2"
              value={voiceId}
              onChange={(e) => onVoiceIdChange(e.target.value)}
              placeholder="Voice ID de Retell, ej. 11labs-Santiago"
            />
          )}
        </div>
        <div>
          <Label htmlFor="voice_speed">Velocidad de habla</Label>
          <select
            id="voice_speed"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SPEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
          <Label htmlFor="model_name">Modelo (IA de conversación)</Label>
          <Input id="model_name" value={modelName} onChange={(e) => onModelNameChange(e.target.value)} placeholder="gpt-4.1" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Todas estas voces ya están listas para usar, incluidas en tu cuenta de Retell. No hay acento argentino en el catálogo
        todavía — México es la variante de español más cercana disponible.
      </p>
    </Card>
  );
}

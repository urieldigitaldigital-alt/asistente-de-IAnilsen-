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

// Voces de ElevenLabs ya agregadas a la cuenta conectada — cualquier negocio
// puede elegirlas directo, sin pegar ningún Voice ID a mano.
const ELEVENLABS_VOICES = [
  { id: "QK4xDwo9ESPHA4JNUpX3", label: "Tomás (es-AR, hombre)" },
  { id: "atjKTpMVR2FSKqU1iDs1", label: "Brigid (es-AR, mujer)" },
];
const CUSTOM_VOICE_VALUE = "__custom__";

const VOICE_PROVIDERS = [
  { id: "azure", label: "Azure (incluido, sin cuenta extra)" },
  { id: "11labs", label: "ElevenLabs (voz más realista, requiere tu propia cuenta)" },
];

const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
];

// ElevenLabs solo acepta velocidad entre 0.7x y 1.2x (VAPI rechaza fuera de
// ese rango con un 400); Azure admite hasta 1.5x. Filtramos según el proveedor.
const SPEED_OPTIONS = [
  { value: 0.9, label: "Más lento (0.9x)" },
  { value: 1, label: "Normal (1x)" },
  { value: 1.15, label: "Un poco más rápido (1.15x)" },
  { value: 1.3, label: "Rápido (1.3x)", azureOnly: true },
  { value: 1.5, label: "Muy rápido (1.5x)", azureOnly: true },
];

interface VoiceLanguageSelectProps {
  voiceProvider: string;
  onVoiceProviderChange: (value: string) => void;
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
  voiceProvider,
  onVoiceProviderChange,
  voiceId,
  onVoiceIdChange,
  speed,
  onSpeedChange,
  language,
  onLanguageChange,
  modelName,
  onModelNameChange,
}: VoiceLanguageSelectProps) {
  const isElevenLabs = voiceProvider === "11labs";
  const elevenLabsPreset = ELEVENLABS_VOICES.find((v) => v.id === voiceId);
  const elevenLabsSelectValue = isElevenLabs && !elevenLabsPreset ? CUSTOM_VOICE_VALUE : (elevenLabsPreset?.id ?? ELEVENLABS_VOICES[0].id);

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Voz, idioma y modelo</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="voice_provider">Proveedor de voz</Label>
          <select
            id="voice_provider"
            value={voiceProvider}
            onChange={(e) => {
              const nextProvider = e.target.value;
              onVoiceProviderChange(nextProvider);
              // Al cambiar de proveedor, el voiceId de Azure no sirve para
              // ElevenLabs (y viceversa) — reseteamos a un valor válido.
              onVoiceIdChange(nextProvider === "11labs" ? ELEVENLABS_VOICES[0].id : AZURE_SPANISH_VOICES[0].id);
              // ElevenLabs no acepta velocidades > 1.2x — VAPI devuelve un 400
              // si se publica con un valor heredado de Azure fuera de rango.
              if (nextProvider === "11labs" && speed > 1.2) onSpeedChange(1.15);
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {VOICE_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          {isElevenLabs ? (
            <>
              <Label htmlFor="voice_id">Voz (ElevenLabs)</Label>
              <select
                id="voice_id"
                value={elevenLabsSelectValue}
                onChange={(e) => {
                  const next = e.target.value;
                  onVoiceIdChange(next === CUSTOM_VOICE_VALUE ? "" : next);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ELEVENLABS_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
                <option value={CUSTOM_VOICE_VALUE}>Otra (pegar Voice ID)…</option>
              </select>
              {elevenLabsSelectValue === CUSTOM_VOICE_VALUE && (
                <Input
                  className="mt-2"
                  value={voiceId}
                  onChange={(e) => onVoiceIdChange(e.target.value)}
                  placeholder="Voice ID de tu Voice Library, ej. EXAVITQu4vr4xnSDxMaL"
                />
              )}
            </>
          ) : (
            <>
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
            </>
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
            {SPEED_OPTIONS.filter((opt) => !isElevenLabs || !opt.azureOnly).map((opt) => (
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
          <Label htmlFor="model_name">Modelo (OpenAI)</Label>
          <Input id="model_name" value={modelName} onChange={(e) => onModelNameChange(e.target.value)} placeholder="gpt-4.1" />
        </div>
      </div>
      {isElevenLabs ? (
        <p className="text-xs text-muted-foreground">
          Estas voces ya están listas para usar, no necesitás ninguna cuenta ni configuración extra. Velocidad máxima admitida
          para ElevenLabs: 1.2x.
        </p>
      ) : null}
    </Card>
  );
}

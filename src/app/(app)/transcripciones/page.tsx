import type { Metadata } from "next";

import { TranscriptList } from "@/components/transcripts/TranscriptList";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { listCalls } from "@/lib/transcriptsData";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Transcripciones — Asistente Nilsen IA" };

interface SearchParams {
  q?: string;
  date?: string;
  hasAppointment?: "yes" | "no";
}

export default async function TranscriptsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams;
  const supabase = await createClient();
  const calls = await listCalls(supabase, filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Transcripciones</h1>
        <p className="text-sm text-muted">Historial de llamadas del asistente, con búsqueda y filtros.</p>
      </div>

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label htmlFor="q" className="mb-1.5 block text-sm font-medium">
              Buscar
            </label>
            <Input id="q" name="q" placeholder="Teléfono o resumen…" defaultValue={filters.q} />
          </div>
          <div>
            <label htmlFor="date" className="mb-1.5 block text-sm font-medium">
              Fecha
            </label>
            <Input id="date" name="date" type="date" defaultValue={filters.date} />
          </div>
          <div>
            <label htmlFor="hasAppointment" className="mb-1.5 block text-sm font-medium">
              ¿Generó cita?
            </label>
            <select
              id="hasAppointment"
              name="hasAppointment"
              defaultValue={filters.hasAppointment ?? ""}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas</option>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card>
        <TranscriptList calls={calls} />
      </Card>
    </div>
  );
}

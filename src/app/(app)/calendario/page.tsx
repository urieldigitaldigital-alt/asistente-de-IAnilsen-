import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { CalendarAgenda } from "@/components/calendar/CalendarAgenda";
import { Card } from "@/components/ui/Card";
import { getCalendarMonthData, parseMonthParam, shiftMonthParam } from "@/lib/calendarData";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Calendario — Asistente Dental IA" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const { start, end, label } = parseMonthParam(month);
  const currentMonth = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data: clinic } = await supabase.from("clinics").select("*").single();
  if (!clinic) return null;

  const [{ appointments, externalEvents }, { data: googleCred }] = await Promise.all([
    getCalendarMonthData(supabase, clinic, start, end),
    supabase.from("google_credentials").select("clinic_id").maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Calendario</h1>
          <p className="text-sm text-muted">Citas agendadas por el asistente y eventos de Google Calendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendario?month=${shiftMonthParam(currentMonth, -1)}`}
            className="rounded-lg border border-border p-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <CaretLeftIcon size={16} />
          </Link>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{label}</span>
          <Link
            href={`/calendario?month=${shiftMonthParam(currentMonth, 1)}`}
            className="rounded-lg border border-border p-2 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <CaretRightIcon size={16} />
          </Link>
        </div>
      </div>

      {!googleCred && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Google Calendar no está conectado: solo se muestran las citas guardadas en el panel.{" "}
          <Link href="/integraciones" className="font-medium underline">
            Conectar ahora
          </Link>
        </p>
      )}

      <Card>
        <CalendarAgenda appointments={appointments} externalEvents={externalEvents} timeZone={clinic.timezone} />
      </Card>
    </div>
  );
}

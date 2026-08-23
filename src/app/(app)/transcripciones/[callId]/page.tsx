import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TranscriptDetail } from "@/components/transcripts/TranscriptDetail";
import { getCallDetail } from "@/lib/transcriptsData";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Transcripción — Asistente Nilsen IA" };

export default async function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const supabase = await createClient();
  const detail = await getCallDetail(supabase, callId);

  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <Link href="/transcripciones" className="text-sm font-medium text-primary hover:underline">
        ← Volver a Transcripciones
      </Link>
      <h1 className="text-xl font-semibold">Detalle de la llamada</h1>
      <TranscriptDetail detail={detail} />
    </div>
  );
}

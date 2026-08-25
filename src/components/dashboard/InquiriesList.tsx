"use client";

import { useTransition } from "react";

import { toggleInquiryContactedAction } from "@/actions/inquiries";
import type { DashboardInquiry } from "@/lib/dashboardData";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" }).format(
    new Date(iso)
  );
}

export function InquiriesList({ inquiries }: { inquiries: DashboardInquiry[] }) {
  const [, startTransition] = useTransition();

  if (inquiries.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay consultas anotadas.</p>;
  }

  return (
    <div className="space-y-2">
      {inquiries.map((inquiry) => (
        <div
          key={inquiry.id}
          className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium">
              {inquiry.customerName || "Sin nombre"} — {inquiry.customerPhone}
            </p>
            <p className="text-muted">{inquiry.reason}</p>
            <p className="text-xs text-muted">{formatTime(inquiry.createdAt)}</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={inquiry.contacted}
              onChange={(e) => {
                const contacted = e.target.checked;
                startTransition(() => {
                  toggleInquiryContactedAction(inquiry.id, contacted);
                });
              }}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Ya lo contacté
          </label>
        </div>
      ))}
    </div>
  );
}

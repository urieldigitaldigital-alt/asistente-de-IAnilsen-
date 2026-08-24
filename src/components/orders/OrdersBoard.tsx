"use client";

import { ForkKnifeIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { updateOrderStatusAction } from "@/actions/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/types/database";

const STATUS_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "recibido", label: "Recibido" },
  { status: "en_preparacion", label: "En preparación" },
  { status: "listo", label: "Listo" },
  { status: "entregado", label: "Entregado" },
];

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

function OrderCard({ order, timeZone, disabled }: { order: Order; timeZone: string; disabled: boolean }) {
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-xs text-muted">{order.customer_phone}</p>
        </div>
        <span className="shrink-0 text-xs text-muted">{formatTime(order.created_at, timeZone)}</span>
      </div>

      <ul className="space-y-0.5 text-xs">
        {order.items.map((item, i) => (
          <li key={i}>
            {item.quantity}× {item.name}
            {item.notes ? ` (${item.notes})` : ""}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">
          {order.order_type === "delivery" ? `Envío: ${order.delivery_address ?? "—"}` : "Retira en el local"}
        </span>
        <span className="font-semibold">${order.total.toFixed(2)}</span>
      </div>

      {order.notes && <p className="text-xs italic text-muted">{order.notes}</p>}

      <select
        value={order.status}
        disabled={disabled}
        onChange={(e) => {
          const status = e.target.value as OrderStatus;
          startTransition(() => {
            updateOrderStatusAction(order.id, status);
          });
        }}
        className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {STATUS_COLUMNS.map(({ status, label }) => (
          <option key={status} value={status}>
            {label}
          </option>
        ))}
        <option value="cancelado">Cancelado</option>
      </select>
    </div>
  );
}

export function OrdersBoard({
  clinicId,
  timeZone,
  initialOrders,
}: {
  clinicId: string;
  timeZone: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isPending] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`orders_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as Order | undefined;
          if (!row?.id) return;
          setOrders((prev) => {
            const withoutRow = prev.filter((o) => o.id !== row.id);
            return [row, ...withoutRow].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, clinicId]);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ForkKnifeIcon}
        title="Todavía no hay pedidos"
        description="En cuanto un cliente haga un pedido por teléfono, va a aparecer acá en vivo."
      />
    );
  }

  const cancelled = orders.filter((o) => o.status === "cancelado");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_COLUMNS.map(({ status, label }) => {
          const columnOrders = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="space-y-2 rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{label}</h3>
                <span className="text-xs text-muted">{columnOrders.length}</span>
              </div>
              <div className="space-y-2">
                {columnOrders.map((order) => (
                  <OrderCard key={order.id} order={order} timeZone={timeZone} disabled={isPending} />
                ))}
                {columnOrders.length === 0 && <p className="py-4 text-center text-xs text-muted">Sin pedidos</p>}
              </div>
            </div>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted">Cancelados ({cancelled.length})</summary>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cancelled.map((order) => (
              <OrderCard key={order.id} order={order} timeZone={timeZone} disabled={isPending} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

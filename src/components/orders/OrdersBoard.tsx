"use client";

import { CurrencyDollarIcon, ForkKnifeIcon, PrinterIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { updateOrderStatusAction } from "@/actions/orders";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/types/database";

const AUTO_PRINT_STORAGE_KEY = "pedidos_auto_print";

// Solo los estados "activos" tienen columna propia en el tablero — una vez
// entregado o cancelado, el pedido ya no requiere acción y estorba en la
// vista de trabajo, así que pasa a las secciones colapsables de abajo.
const ACTIVE_STATUS_COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "recibido", label: "Recibido" },
  { status: "en_preparacion", label: "En preparación" },
  { status: "listo", label: "Listo" },
];
const ALL_STATUSES: { status: OrderStatus; label: string }[] = [...ACTIVE_STATUS_COLUMNS, { status: "entregado", label: "Entregado" }];

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

function localDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function isToday(iso: string, timeZone: string): boolean {
  return localDateKey(iso, timeZone) === localDateKey(new Date().toISOString(), timeZone);
}

// Orden de llegada: el pedido que espera hace más tiempo se procesa primero.
// Para "Listo" se ordena por cuándo quedó listo (updated_at), no por cuándo
// se hizo el pedido, para armar el reparto en el orden correcto.
function sortByArrival(orders: Order[], status: OrderStatus): Order[] {
  const field: keyof Order = status === "listo" ? "updated_at" : "created_at";
  return [...orders].sort((a, b) => new Date(a[field] as string).getTime() - new Date(b[field] as string).getTime());
}

function formatTicketDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Ticket de cocina: solo esto se ve al imprimir (ver print:hidden en el
 * resto del tablero) — ancho fijo pensado para impresora térmica de 80mm.
 */
function PrintTicket({ order, clinicName, timeZone }: { order: Order | null; clinicName: string; timeZone: string }) {
  if (!order) return null;
  return (
    <div className="hidden print:block print:w-full print:font-mono print:text-black">
      <p className="text-center text-base font-bold">{clinicName}</p>
      <p className="text-center text-2xl font-bold">Pedido #{order.order_number}</p>
      <p className="text-center text-xs">{formatTicketDateTime(order.created_at, timeZone)}</p>
      <p className="my-1 border-t border-dashed border-black" />
      <p className="text-sm font-bold">{order.order_type === "delivery" ? "ENVÍO A DOMICILIO" : "RETIRA EN EL LOCAL"}</p>
      {order.order_type === "delivery" && order.delivery_address && <p className="text-sm">{order.delivery_address}</p>}
      <p className="text-sm">{order.customer_name}</p>
      <p className="text-sm">{order.customer_phone}</p>
      <p className="my-1 border-t border-dashed border-black" />
      <ul className="space-y-1 text-sm">
        {order.items.map((item, i) => (
          <li key={i}>
            <span className="font-bold">{item.quantity}×</span> {item.name}
            {item.notes ? <span className="block pl-4 text-xs italic">— {item.notes}</span> : null}
          </li>
        ))}
      </ul>
      <p className="my-1 border-t border-dashed border-black" />
      {order.notes && (
        <>
          <p className="text-sm italic">Nota: {order.notes}</p>
          <p className="my-1 border-t border-dashed border-black" />
        </>
      )}
      <p className="text-right text-base font-bold">Total: ${order.total.toFixed(2)}</p>
    </div>
  );
}

function OrderCard({
  order,
  timeZone,
  disabled,
  onPrint,
}: {
  order: Order;
  timeZone: string;
  disabled: boolean;
  onPrint: (order: Order) => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            <span className="text-primary">#{order.order_number}</span> {order.customer_name}
          </p>
          <p className="text-xs text-muted">{order.customer_phone}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted">{formatTime(order.created_at, timeZone)}</span>
          <button
            type="button"
            onClick={() => onPrint(order)}
            className="rounded p-1 text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            aria-label="Imprimir ticket"
            title="Imprimir ticket"
          >
            <PrinterIcon size={14} />
          </button>
        </div>
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
        {ALL_STATUSES.map(({ status, label }) => (
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
  clinicName,
  timeZone,
  initialOrders,
}: {
  clinicId: string;
  clinicName: string;
  timeZone: string;
  initialOrders: Order[];
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isPending] = useTransition();

  // Impresión automática del ticket: cada negocio (y cada dispositivo, ej.
  // la tablet de la cocina) la prende o apaga según si tiene una impresora
  // conectada — se guarda por dispositivo, no es un dato del negocio.
  const [autoPrint, setAutoPrint] = useState(false);
  const [printQueue, setPrintQueue] = useState<Order[]>([]);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const autoPrintRef = useRef(autoPrint);
  autoPrintRef.current = autoPrint;

  const [search, setSearch] = useState("");

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTO_PRINT_STORAGE_KEY);
    if (stored !== null) setAutoPrint(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(AUTO_PRINT_STORAGE_KEY, String(autoPrint));
  }, [autoPrint]);

  const handlePrint = useCallback((order: Order) => {
    setPrintQueue((q) => [...q, order]);
  }, []);

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
          // Solo los pedidos nuevos (no cambios de estado) disparan la
          // impresión automática, y solo si este dispositivo la tiene prendida.
          if (payload.eventType === "INSERT" && autoPrintRef.current) {
            handlePrint(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, clinicId, handlePrint]);

  // Procesa la cola de impresión de a un ticket por vez (el diálogo de
  // impresión del navegador es bloqueante dentro de la pestaña).
  useEffect(() => {
    if (!printingOrder && printQueue.length > 0) {
      setPrintingOrder(printQueue[0]);
      setPrintQueue((q) => q.slice(1));
    }
  }, [printQueue, printingOrder]);

  useEffect(() => {
    if (!printingOrder) return;
    const id = setTimeout(() => window.print(), 150);
    return () => clearTimeout(id);
  }, [printingOrder]);

  useEffect(() => {
    const onAfterPrint = () => setPrintingOrder(null);
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, []);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ForkKnifeIcon}
        title="Todavía no hay pedidos"
        description="En cuanto un cliente haga un pedido por teléfono, va a aparecer acá en vivo."
      />
    );
  }

  const todayOrders = orders.filter((o) => isToday(o.created_at, timeZone));
  const revenueToday = todayOrders.filter((o) => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0);
  const deliveredToday = todayOrders.filter((o) => o.status === "entregado").sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const cancelled = orders.filter((o) => o.status === "cancelado");

  const trimmedSearch = search.trim().toLowerCase();
  const searchResults = trimmedSearch
    ? orders
        .filter(
          (o) =>
            String(o.order_number).includes(trimmedSearch) ||
            o.customer_name.toLowerCase().includes(trimmedSearch) ||
            o.customer_phone.includes(trimmedSearch)
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : null;

  return (
    <>
      <div className="space-y-4 print:hidden">
        <Card className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <CurrencyDollarIcon size={20} weight="fill" />
            <h2 className="text-sm font-semibold text-foreground">Facturación de hoy</h2>
          </div>
          <p className="text-2xl font-semibold">${revenueToday.toFixed(2)}</p>
          <p className="text-sm text-muted">
            {todayOrders.length} {todayOrders.length === 1 ? "pedido" : "pedidos"} hoy
            {cancelled.filter((o) => isToday(o.created_at, timeZone)).length > 0
              ? ` (${cancelled.filter((o) => isToday(o.created_at, timeZone)).length} cancelado${cancelled.filter((o) => isToday(o.created_at, timeZone)).length === 1 ? "" : "s"}, no cuenta)`
              : ""}
          </p>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Imprimir tickets automático (este dispositivo)
          </label>
        </Card>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número de pedido, nombre o teléfono…"
        />

        {searchResults ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">
              {searchResults.length === 0
                ? "Sin resultados."
                : `${searchResults.length} resultado${searchResults.length === 1 ? "" : "s"}`}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {searchResults.map((order) => (
                <OrderCard key={order.id} order={order} timeZone={timeZone} disabled={isPending} onPrint={handlePrint} />
              ))}
            </div>
          </div>
        ) : (
          <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ACTIVE_STATUS_COLUMNS.map(({ status, label }) => {
            const columnOrders = sortByArrival(
              orders.filter((o) => o.status === status),
              status
            );
            return (
              <div key={status} className="space-y-2 rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <span className="text-xs text-muted">{columnOrders.length}</span>
                </div>
                <div className="space-y-2">
                  {columnOrders.map((order) => (
                    <OrderCard key={order.id} order={order} timeZone={timeZone} disabled={isPending} onPrint={handlePrint} />
                  ))}
                  {columnOrders.length === 0 && <p className="py-4 text-center text-xs text-muted">Sin pedidos</p>}
                </div>
              </div>
            );
          })}
        </div>

        {deliveredToday.length > 0 && (
          <details className="rounded-xl border border-border bg-surface p-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted">Entregados hoy ({deliveredToday.length})</summary>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {deliveredToday.map((order) => (
                <OrderCard key={order.id} order={order} timeZone={timeZone} disabled={isPending} onPrint={handlePrint} />
              ))}
            </div>
          </details>
        )}

        {cancelled.length > 0 && (
          <details className="rounded-xl border border-border bg-surface p-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted">Cancelados ({cancelled.length})</summary>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {cancelled.map((order) => (
                <OrderCard key={order.id} order={order} timeZone={timeZone} disabled={isPending} onPrint={handlePrint} />
              ))}
            </div>
          </details>
        )}
          </>
        )}
      </div>

      <PrintTicket order={printingOrder} clinicName={clinicName} timeZone={timeZone} />
    </>
  );
}

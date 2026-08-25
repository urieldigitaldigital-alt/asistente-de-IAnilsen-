"use client";

import { PlusIcon, TrashIcon, UsersIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { assignReservationAction, deleteTableAction, saveTablesLayoutAction, updateReservationStatusAction } from "@/actions/tables";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { ReservationStatus, RestaurantTable, TableReservation } from "@/types/database";

function localDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function isToday(iso: string, timeZone: string): boolean {
  return localDateKey(iso, timeZone) === localDateKey(new Date().toISOString(), timeZone);
}

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

function TableBox({
  table,
  editMode,
  reserved,
  selectable,
  onMove,
  onDelete,
  onClick,
}: {
  table: RestaurantTable;
  editMode: boolean;
  reserved: boolean;
  selectable: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  return (
    <div
      ref={ref}
      style={{ left: table.pos_x, top: table.pos_y }}
      onPointerDown={(e) => {
        if (!editMode) return;
        dragging.current = { startX: e.clientX, startY: e.clientY, origX: table.pos_x, origY: table.pos_y };
        ref.current?.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const dx = e.clientX - dragging.current.startX;
        const dy = e.clientY - dragging.current.startY;
        onMove(table.id, Math.max(0, dragging.current.origX + dx), Math.max(0, dragging.current.origY + dy));
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onClick={onClick}
      className={`absolute flex h-20 w-20 select-none flex-col items-center justify-center rounded-xl border-2 text-xs font-medium ${
        editMode
          ? "cursor-grab border-border bg-surface active:cursor-grabbing"
          : reserved
            ? "border-danger bg-danger/10 text-danger"
            : selectable
              ? "cursor-pointer border-primary bg-primary/10"
              : "border-border bg-surface"
      }`}
    >
      <span className="text-base font-bold">#{table.table_number}</span>
      <span className="flex items-center gap-0.5 text-[10px] text-muted">
        <UsersIcon size={10} />
        {table.seats}
      </span>
      {editMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(table.id);
          }}
          className="absolute -right-2 -top-2 rounded-full bg-danger p-0.5 text-white"
          aria-label="Eliminar mesa"
        >
          <TrashIcon size={10} />
        </button>
      )}
    </div>
  );
}

export function MesasBoard({
  clinicId,
  timeZone,
  initialTables,
  initialReservations,
}: {
  clinicId: string;
  timeZone: string;
  initialTables: RestaurantTable[];
  initialReservations: TableReservation[];
}) {
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [reservations, setReservations] = useState<TableReservation[]>(initialReservations);
  const [editMode, setEditMode] = useState(false);
  const [editTables, setEditTables] = useState<RestaurantTable[]>(initialTables);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`table_reservations_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_reservations", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as TableReservation | undefined;
          if (!row?.id) return;
          setReservations((prev) => {
            const withoutRow = prev.filter((r) => r.id !== row.id);
            return [...withoutRow, row].sort(
              (a, b) => new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, clinicId]);

  const activeTables = editMode ? editTables : tables;
  const pendingReservations = reservations.filter((r) => r.status === "pendiente");
  const otherReservations = reservations.filter((r) => r.status !== "pendiente");
  const reservedTableIds = new Set(
    reservations
      .filter((r) => r.status === "asignada" && r.table_id && isToday(r.reservation_time, timeZone))
      .map((r) => r.table_id as string)
  );

  function handleEnterEdit() {
    setEditTables(tables);
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
  }

  function handleAddTable() {
    const nextNumber = editTables.reduce((max, t) => Math.max(max, t.table_number), 0) + 1;
    const newTable: RestaurantTable = {
      id: `new-${Date.now()}`,
      clinic_id: clinicId,
      table_number: nextNumber,
      seats: 2,
      pos_x: 20,
      pos_y: 20,
      created_at: new Date().toISOString(),
    };
    setEditTables((prev) => [...prev, newTable]);
  }

  function handleMove(id: string, x: number, y: number) {
    setEditTables((prev) => prev.map((t) => (t.id === id ? { ...t, pos_x: x, pos_y: y } : t)));
  }

  function handleDeleteInEdit(id: string) {
    setEditTables((prev) => prev.filter((t) => t.id !== id));
  }

  function handleSaveLayout() {
    startSaving(async () => {
      const removedIds = tables.filter((t) => !editTables.some((et) => et.id === t.id)).map((t) => t.id);
      for (const id of removedIds) {
        await deleteTableAction(id);
      }
      const payload = editTables.map((t) => ({
        id: t.id.startsWith("new-") ? undefined : t.id,
        table_number: t.table_number,
        seats: t.seats,
        pos_x: t.pos_x,
        pos_y: t.pos_y,
      }));
      const result = await saveTablesLayoutAction(payload);
      if (!result.error) {
        setTables(editTables);
        setEditMode(false);
      }
    });
  }

  function handleTableClick(table: RestaurantTable) {
    if (editMode || !selectedReservationId || reservedTableIds.has(table.id)) return;
    startTransition(() => {
      assignReservationAction(selectedReservationId, table.id);
    });
    setSelectedReservationId(null);
  }

  return (
    <div className="space-y-4">
      {pendingReservations.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">Reservas sin mesa asignada</h2>
          <p className="text-xs text-muted">Tocá una reserva y después tocá una mesa libre para asignarla.</p>
          <div className="flex flex-wrap gap-2">
            {pendingReservations.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReservationId((prev) => (prev === r.id ? null : r.id))}
                className={`rounded-lg border px-3 py-2 text-left text-xs ${
                  selectedReservationId === r.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <p className="font-medium">
                  {r.customer_name} ({r.party_size})
                </p>
                <p className="text-muted">{formatTime(r.reservation_time, timeZone)}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Mesas</h2>
          {editMode ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCancelEdit} className="text-xs text-muted hover:underline">
                Cancelar
              </button>
              <Button type="button" variant="secondary" onClick={handleAddTable}>
                <PlusIcon size={14} /> Agregar mesa
              </Button>
              <Button type="button" onClick={handleSaveLayout} disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar distribución"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={handleEnterEdit}>
              Editar distribución
            </Button>
          )}
        </div>

        {activeTables.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {editMode ? "Tocá \"Agregar mesa\" para empezar a armar tu salón." : "Todavía no configuraste tus mesas."}
          </p>
        ) : (
          <div className="relative h-[500px] overflow-auto rounded-xl border border-dashed border-border bg-background">
            {activeTables.map((table) => (
              <TableBox
                key={table.id}
                table={table}
                editMode={editMode}
                reserved={reservedTableIds.has(table.id)}
                selectable={!editMode && Boolean(selectedReservationId) && !reservedTableIds.has(table.id)}
                onMove={handleMove}
                onDelete={handleDeleteInEdit}
                onClick={() => handleTableClick(table)}
              />
            ))}
          </div>
        )}
      </Card>

      {otherReservations.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted">Todas las reservas ({otherReservations.length})</summary>
          <div className="mt-2 space-y-2">
            {otherReservations.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <div>
                  <p className="font-medium">
                    {r.customer_name} — {r.party_size} personas
                  </p>
                  <p className="text-xs text-muted">
                    {formatTime(r.reservation_time, timeZone)} · Mesa {tables.find((t) => t.id === r.table_id)?.table_number ?? "—"}
                  </p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) =>
                    startTransition(() => {
                      updateReservationStatusAction(r.id, e.target.value as ReservationStatus);
                    })
                  }
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="asignada">Asignada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

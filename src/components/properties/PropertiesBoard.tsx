"use client";

import { HouseLineIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import { createPropertyAction, deletePropertyAction, updatePropertyStatusAction, updateVisitStatusAction } from "@/actions/properties";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Label } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import type { Property, PropertyStatus, PropertyVisit, VisitStatus } from "@/types/database";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida/Alquilada",
};

function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR")}`;
}

function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone }).format(
    new Date(iso)
  );
}

function AddPropertyForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createPropertyAction, { error: null, success: null });

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <PlusIcon size={14} /> Agregar propiedad
      </Button>
    );
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold">Nueva propiedad</h2>
      <form action={formAction} className="space-y-3">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" placeholder="Depto 2 ambientes con balcón" required />
        </div>
        <div>
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" name="address" required />
        </div>
        <div>
          <Label htmlFor="price">Precio</Label>
          <Input id="price" name="price" type="number" min={0} step={1} required />
        </div>
        <div>
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <Label htmlFor="photo">Foto (opcional)</Label>
          <input id="photo" name="photo" type="file" accept="image/*" className="block w-full text-sm" />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar propiedad"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const [, startTransition] = useTransition();

  return (
    <Card className="space-y-2 overflow-hidden p-0">
      {property.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={property.photo_url} alt={property.title} className="h-40 w-full object-cover" />
      )}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{property.title}</p>
            <p className="text-xs text-muted">{property.address}</p>
          </div>
          <button
            type="button"
            onClick={() => startTransition(() => deletePropertyAction(property.id))}
            className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
            aria-label="Eliminar propiedad"
          >
            <TrashIcon size={14} />
          </button>
        </div>
        <p className="text-lg font-semibold text-primary">{formatPrice(property.price)}</p>
        {property.description && <p className="text-sm text-muted">{property.description}</p>}
        <select
          value={property.status}
          onChange={(e) =>
            startTransition(() => {
              updatePropertyStatusAction(property.id, e.target.value as PropertyStatus);
            })
          }
          className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}

export function PropertiesBoard({
  clinicId,
  timeZone,
  initialProperties,
  initialVisits,
}: {
  clinicId: string;
  timeZone: string;
  initialProperties: Property[];
  initialVisits: (PropertyVisit & { propertyTitle: string })[];
}) {
  const [properties, setProperties] = useState(initialProperties);
  const [visits, setVisits] = useState(initialVisits);
  const [, startTransition] = useTransition();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`properties_${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "properties", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const row = payload.new as Property | undefined;
          if (!row?.id) return;
          setProperties((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "properties", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          const oldRow = payload.old as { id?: string } | undefined;
          if (!oldRow?.id) return;
          setProperties((prev) => prev.filter((p) => p.id !== oldRow.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, clinicId]);

  return (
    <div className="space-y-4">
      <AddPropertyForm />

      {properties.length === 0 ? (
        <EmptyState
          icon={HouseLineIcon}
          title="Todavía no cargaste propiedades"
          description="Agregá al menos una para que el asistente pueda ofrecerla cuando alguien llame."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {visits.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">Visitas solicitadas</h2>
          <div className="space-y-2">
            {visits.map((visit) => (
              <div key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                <div>
                  <p className="font-medium">
                    {visit.customer_name} — {visit.propertyTitle}
                  </p>
                  <p className="text-xs text-muted">
                    {visit.customer_phone} · {formatDateTime(visit.visit_time, timeZone)}
                  </p>
                </div>
                <select
                  value={visit.status}
                  onChange={(e) => {
                    const status = e.target.value as VisitStatus;
                    setVisits((prev) => prev.map((v) => (v.id === visit.id ? { ...v, status } : v)));
                    startTransition(() => {
                      updateVisitStatusAction(visit.id, status);
                    });
                  }}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

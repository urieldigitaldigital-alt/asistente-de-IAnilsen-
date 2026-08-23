"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import type { ClinicService } from "@/types/database";

export function ServicesEditor({
  services,
  onChange,
}: {
  services: ClinicService[];
  onChange: (value: ClinicService[]) => void;
}) {
  const updateAt = (index: number, patch: Partial<ClinicService>) => {
    const next = [...services];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Servicios</h2>
          <p className="text-xs text-muted">Nombre, duración y descripción de cada servicio que ofrece tu negocio.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...services, { name: "", duration_minutes: 30, description: "" }])}
        >
          <PlusIcon size={14} /> Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {services.map((service, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
            <div>
              <Label htmlFor={`service_name_${index}`}>Nombre</Label>
              <Input
                id={`service_name_${index}`}
                value={service.name}
                onChange={(e) => updateAt(index, { name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`service_duration_${index}`}>Duración (min)</Label>
              <Input
                id={`service_duration_${index}`}
                type="number"
                min={5}
                step={5}
                value={service.duration_minutes}
                onChange={(e) => updateAt(index, { duration_minutes: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor={`service_desc_${index}`}>Descripción</Label>
              <Input
                id={`service_desc_${index}`}
                value={service.description ?? ""}
                onChange={(e) => updateAt(index, { description: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(services.filter((_, i) => i !== index))}
              className="rounded-lg p-2 text-danger hover:bg-danger/10"
              aria-label="Eliminar servicio"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
        {services.length === 0 && <p className="text-sm text-muted">Sin servicios configurados.</p>}
      </div>
    </Card>
  );
}

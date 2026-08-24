"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import type { MenuItem } from "@/types/database";

export function MenuEditor({
  menuItems,
  onChange,
}: {
  menuItems: MenuItem[];
  onChange: (value: MenuItem[]) => void;
}) {
  const updateAt = (index: number, patch: Partial<MenuItem>) => {
    const next = [...menuItems];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Carta</h2>
          <p className="text-xs text-muted">Nombre, precio, categoría y descripción de cada producto que ofrece tu negocio.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...menuItems, { name: "", price: 0, description: "", category: "" }])}
        >
          <PlusIcon size={14} /> Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto] sm:items-end"
          >
            <div>
              <Label htmlFor={`menu_name_${index}`}>Nombre</Label>
              <Input id={`menu_name_${index}`} value={item.name} onChange={(e) => updateAt(index, { name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`menu_price_${index}`}>Precio</Label>
              <Input
                id={`menu_price_${index}`}
                type="number"
                min={0}
                step={0.01}
                value={item.price}
                onChange={(e) => updateAt(index, { price: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor={`menu_category_${index}`}>Categoría</Label>
              <Input
                id={`menu_category_${index}`}
                placeholder="Entradas, bebidas…"
                value={item.category ?? ""}
                onChange={(e) => updateAt(index, { category: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`menu_desc_${index}`}>Descripción</Label>
              <Input
                id={`menu_desc_${index}`}
                value={item.description ?? ""}
                onChange={(e) => updateAt(index, { description: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(menuItems.filter((_, i) => i !== index))}
              className="rounded-lg p-2 text-danger hover:bg-danger/10"
              aria-label="Eliminar producto"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
        {menuItems.length === 0 && <p className="text-sm text-muted">Sin productos configurados.</p>}
      </div>
    </Card>
  );
}

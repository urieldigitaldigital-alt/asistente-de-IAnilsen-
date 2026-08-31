"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { signup, type AuthFormState } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { CUSTOM_TIMEZONE_VALUE, TIMEZONE_OPTIONS } from "@/lib/timezones";

const initialState: AuthFormState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  // Recarga completa (no navegación de Next.js) para asegurar que no quede
  // en memoria ningún dato de una sesión anterior si se estaba usando otra
  // cuenta en esta misma pestaña.
  useEffect(() => {
    if (state.redirectTo) window.location.href = state.redirectTo;
  }, [state.redirectTo]);

  const busy = pending || Boolean(state.redirectTo);

  // Default seguro para el render del servidor; en el cliente, apenas monta,
  // lo reemplazamos por la zona horaria real del navegador de quien se registra.
  const [timezone, setTimezone] = useState<string>(TIMEZONE_OPTIONS[0].value);
  const [customTimezone, setCustomTimezone] = useState("");

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONE_OPTIONS.some((tz) => tz.value === detected)) {
        setTimezone(detected);
      } else if (detected) {
        setCustomTimezone(detected);
        setTimezone(CUSTOM_TIMEZONE_VALUE);
      }
    } catch {
      // Se queda con el default si el navegador no soporta la detección.
    }
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      {busy && <LoadingOverlay text="Creando cuenta…" />}
      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="clinic_name">Nombre de tu negocio</Label>
        <Input id="clinic_name" name="clinic_name" type="text" required />
      </div>
      <div>
        <Label htmlFor="business_type">Tipo de negocio</Label>
        <select
          id="business_type"
          name="business_type"
          defaultValue="citas"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="citas">Citas (clínica, salón, barbería, consultorio…)</option>
          <option value="pedidos">Pedidos (rotisería, delivery, sin mesas)</option>
          <option value="restaurante">Restaurante (carta + mesas y reservas)</option>
          <option value="inmobiliaria">Inmobiliaria (propiedades y visitas)</option>
          <option value="llamadas">Llamadas (solo toma consultas y teléfono)</option>
        </select>
        <p className="mt-1 text-xs text-muted">Podés cambiarlo después en Personalización.</p>
      </div>
      <div>
        <Label htmlFor="full_name">Tu nombre</Label>
        <Input id="full_name" name="full_name" type="text" autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <Label htmlFor="timezone">Zona horaria de tu negocio</Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
          <option value={CUSTOM_TIMEZONE_VALUE}>Otra (escribir manualmente)…</option>
        </select>
        {timezone === CUSTOM_TIMEZONE_VALUE && (
          <Input
            className="mt-2"
            value={customTimezone}
            onChange={(e) => setCustomTimezone(e.target.value)}
            placeholder="America/Mexico_City"
          />
        )}
        <input type="hidden" name="timezone" value={timezone === CUSTOM_TIMEZONE_VALUE ? customTimezone : timezone} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

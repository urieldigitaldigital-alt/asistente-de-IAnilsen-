/**
 * Estado de la configuración de Meta necesaria para el botón "Conectar con
 * Facebook" (Embedded Signup). Son variables de la plataforma, no del negocio:
 * se configuran una sola vez (ver README) y valen para todos los tenants.
 *
 * Existe porque el botón antes hacía `return null` cuando faltaba una variable
 * — el dueño del negocio veía la tarjeta de WhatsApp sin ningún botón y sin
 * ninguna explicación, como si la función no existiera.
 */

interface RequiredVar {
  name: string;
  value: string | undefined;
}

export interface MetaSetupStatus {
  /** true si están todas las variables y el flujo de un clic se puede ofrecer. */
  ready: boolean;
  /** Nombres de las variables que faltan — solo para el administrador de la plataforma, no para el dueño del negocio. */
  missing: string[];
}

export function getMetaSetupStatus(): MetaSetupStatus {
  // NEXT_PUBLIC_META_APP_ID y META_APP_ID son el mismo valor duplicado: el
  // SDK del navegador necesita el público, y el intercambio del code en el
  // servidor usa el privado junto al secret.
  const required: RequiredVar[] = [
    { name: "NEXT_PUBLIC_META_APP_ID", value: process.env.NEXT_PUBLIC_META_APP_ID },
    { name: "NEXT_PUBLIC_META_CONFIG_ID", value: process.env.NEXT_PUBLIC_META_CONFIG_ID },
    { name: "META_APP_ID", value: process.env.META_APP_ID },
    { name: "META_APP_SECRET", value: process.env.META_APP_SECRET },
    { name: "META_WEBHOOK_VERIFY_TOKEN", value: process.env.META_WEBHOOK_VERIFY_TOKEN },
  ];

  const missing = required.filter((item) => !item.value?.trim()).map((item) => item.name);
  return { ready: missing.length === 0, missing };
}

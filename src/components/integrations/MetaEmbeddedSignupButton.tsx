"use client";

import { FacebookLogoIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

type FacebookLoginResponse = { authResponse?: { code?: string } };

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// Misma versión que usa src/lib/whatsapp/meta.ts para las llamadas server-side.
const SDK_VERSION = "v21.0";

interface SignupResult {
  wabaId: string;
  phoneNumberId: string;
  businessId: string;
}

type Status = "idle" | "waiting" | "exchanging" | "error";

export function MetaEmbeddedSignupButton({
  onConnected,
  label = "Conectar con Facebook",
}: {
  onConnected: () => void;
  label?: string;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Refs porque el code (callback de FB.login) y los IDs del WABA (evento
  // FINISH del postMessage) llegan por dos canales separados, en cualquier
  // orden — no se puede esperar a ninguno de los dos en particular.
  const codeRef = useRef<string | null>(null);
  const signupRef = useRef<SignupResult | null>(null);
  const exchangedRef = useRef(false);

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;

  useEffect(() => {
    if (window.FB) {
      setSdkReady(true);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: appId ?? "", autoLogAppEvents: true, xfbml: true, version: SDK_VERSION });
      setSdkReady(true);
    };
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/es_LA/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [appId]);

  const tryExchange = useCallback(() => {
    if (exchangedRef.current) return;
    const code = codeRef.current;
    const signup = signupRef.current;
    if (!code || !signup) return;
    exchangedRef.current = true;
    setStatus("exchanging");

    fetch("/api/meta/embedded-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...signup }),
    })
      .then(async (response) => {
        const resBody = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(resBody.error ?? "No se pudo completar la conexión.");
        setStatus("idle");
        onConnected();
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "No se pudo completar la conexión.");
      });
  }, [onConnected]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      let data: { type?: string; event?: string; data?: Record<string, string> };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type !== "WA_EMBEDDED_SIGNUP") return;

      if (data.event === "FINISH" && data.data) {
        signupRef.current = {
          wabaId: data.data.waba_id,
          phoneNumberId: data.data.phone_number_id,
          businessId: data.data.business_id,
        };
        tryExchange();
      } else if (data.event === "CANCEL") {
        setStatus("idle");
      } else if (data.event === "ERROR") {
        setStatus("error");
        setError("Meta canceló la conexión. Probá de nuevo.");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [tryExchange]);

  const handleLogin = useCallback(() => {
    if (!window.FB) return;
    exchangedRef.current = false;
    codeRef.current = null;
    signupRef.current = null;
    setError(null);
    setStatus("waiting");

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setStatus("idle");
          return;
        }
        codeRef.current = code;
        tryExchange();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          // Sin featureType el popup abre el alta de WhatsApp Business
          // completa; sessionInfoVersion 3 es la que entrega waba_id y
          // phone_number_id en el postMessage que escuchamos más arriba (con
          // la versión vieja llegaban solo algunos campos).
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    );
  }, [configId, tryExchange]);

  // Antes esto era `return null`: si faltaba una variable de entorno, el dueño
  // del negocio no veía ningún botón ni ninguna explicación. Ahora se dice
  // qué pasa, en lenguaje de dueño de negocio.
  if (!appId || !configId) {
    return (
      <p className="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm text-muted dark:bg-white/5">
        La conexión en un clic todavía no está habilitada en esta instalación. Mientras tanto podés conectar WhatsApp a mano
        acá abajo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogin}
        disabled={!sdkReady || status === "exchanging" || status === "waiting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1465cc] disabled:opacity-60"
      >
        <FacebookLogoIcon size={18} weight="fill" />
        {status === "exchanging"
          ? "Conectando…"
          : status === "waiting"
            ? "Completá el paso en la ventana de Facebook…"
            : label}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

"use client";

import { BellIcon, BellRingingIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { subscribeToPushAction, unsubscribeFromPushAction } from "@/actions/push";
import { Button } from "@/components/ui/Button";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Safe);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "checking" | "unsupported" | "off" | "on" | "denied";

function getInitialStatus(): Status {
  if (typeof window === "undefined") return "checking";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "checking";
}

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>(getInitialStatus);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status !== "checking") return;
    // getRegistration() resuelve enseguida con undefined si nunca se
    // registró el service worker — a diferencia de `.ready`, que se queda
    // esperando para siempre en ese caso (nunca hay nada que "esté listo"),
    // dejando el botón invisible para siempre en la primera visita.
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription() ?? null)
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, [status]);

  async function handleActivate() {
    setPending(true);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Notificaciones no configuradas.");

      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      const { error } = await subscribeToPushAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (error) throw new Error(error);
      setStatus("on");
    } catch (err) {
      console.error("No se pudo activar las notificaciones:", err);
      setStatus("off");
    } finally {
      setPending(false);
    }
  }

  async function handleDeactivate() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setPending(false);
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <p className="text-xs text-muted">
        Bloqueaste las notificaciones de este sitio en el navegador — para activarlas, habilitalas desde la configuración del
        sitio en Chrome.
      </p>
    );
  }

  if (status === "on") {
    return (
      <Button type="button" variant="secondary" onClick={handleDeactivate} disabled={pending} className="text-xs">
        <BellRingingIcon size={16} weight="fill" className="text-primary" />
        Notificaciones activadas
      </Button>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={handleActivate} disabled={pending} className="text-xs">
      <BellIcon size={16} />
      {pending ? "Activando…" : "Avisame en este navegador cuando agenden una llamada"}
    </Button>
  );
}

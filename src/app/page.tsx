import { redirect } from "next/navigation";

// proxy.ts ya redirige a /login a cualquier visitante no autenticado antes de
// llegar aquí, así que si esta página se renderiza es porque hay sesión.
export default function Home() {
  redirect("/dashboard");
}

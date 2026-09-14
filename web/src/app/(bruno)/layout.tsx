import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { sessionCourante } from "@/auth/serveur";
import { Rail } from "./Rail";

/**
 * Le cadre de toutes les pages de Bruno : le rail à gauche, la page à droite. Il vit ici plutôt
 * que dans chaque page pour une raison simple : un layout ne se re-rend pas quand on navigue.
 * Le rail reste à l'écran, seule la page change — et avec `loading.tsx`, elle change tout de suite.
 */
export default async function CadreBruno({ children }: { children: ReactNode }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  return (
    <div className="flex h-dvh overflow-hidden">
      <Rail initiale={session.nom.charAt(0).toUpperCase()} avatar={session.avatar} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

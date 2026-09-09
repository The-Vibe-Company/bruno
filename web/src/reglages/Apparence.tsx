"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Theme } from "@/lib/theme";
import { appliquerTheme } from "./theme-client";

const CHOIX: { valeur: Theme; libelle: string; sous: string }[] = [
  { valeur: "systeme", libelle: "Système", sous: "comme le Mac" },
  { valeur: "clair", libelle: "Clair", sous: "toujours" },
  { valeur: "sombre", libelle: "Sombre", sous: "toujours" },
];

/** Clair, sombre, ou comme le Mac — trois vignettes qui montrent ce qu'elles disent. Appliqué tout de suite, retenu pour la prochaine fois. */
export function Apparence({ initial }: { initial: Theme }) {
  const router = useRouter();
  const [theme, setTheme] = useState(initial);
  const choisir = (t: Theme) => { setTheme(t); appliquerTheme(t); router.refresh(); };
  return (
    <section>
      <header className="border-b border-accent pb-2.5"><h2 className="text-xl font-medium tracking-tight">Apparence</h2></header>
      <div role="radiogroup" aria-label="Apparence" className="mt-4 grid grid-cols-3 gap-3">
        {CHOIX.map((c) => {
          const actif = theme === c.valeur;
          return (
            <button key={c.valeur} role="radio" aria-checked={actif} onClick={() => choisir(c.valeur)}
              className={`group flex flex-col gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${actif ? "border-accent bg-accent-voile" : "border-bord hover:border-bord-fort"}`}>
              <Vignette theme={c.valeur} />
              <span className="flex items-center gap-2 px-0.5">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${actif ? "border-accent bg-accent" : "border-bord-fort"}`}>
                  {actif && <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="stroke-sur-accent" strokeWidth="2"><path d="M1.5 5.5l2.5 2.5L8.5 2.5" /></svg>}
                </span>
                <span className="text-[14px] font-medium">{c.libelle}</span>
                <span className="text-[12.5px] text-texte-sourd">{c.sous}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Une petite fenêtre de Bruno, dans le thème qu'elle représente — la vignette « Système » est coupée en deux. */
function Vignette({ theme }: { theme: Theme }) {
  const moitie = (sombre: boolean) => (
    <div className={`flex h-full flex-1 flex-col gap-1.5 p-2 ${sombre ? "bg-[var(--vignette-fond-sombre)]" : "bg-[var(--vignette-fond-clair)]"}`}>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-[2px] bg-accent" />
        <span className={`h-1 w-6 rounded-full ${sombre ? "bg-[var(--vignette-texte-sombre)]" : "bg-[var(--vignette-texte-clair)]"}`} />
      </div>
      <div className={`h-6 rounded-md border ${sombre ? "border-[var(--vignette-bord-sombre)] bg-[var(--vignette-surface-sombre)]" : "border-[var(--vignette-bord-clair)] bg-[var(--vignette-surface-clair)]"}`} />
      <div className={`h-4 rounded-md border ${sombre ? "border-[var(--vignette-bord-sombre)] bg-[var(--vignette-surface-sombre)]" : "border-[var(--vignette-bord-clair)] bg-[var(--vignette-surface-clair)]"}`} />
    </div>
  );
  return (
    <div className="flex h-[72px] w-full overflow-hidden rounded-lg border border-bord-2">
      {theme === "systeme" ? <>{moitie(false)}{moitie(true)}</> : moitie(theme === "sombre")}
    </div>
  );
}

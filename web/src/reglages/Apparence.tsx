"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Theme } from "@/lib/theme";
import { appliquerTheme } from "./theme-client";

const CHOIX: { valeur: Theme; libelle: string }[] = [{ valeur: "systeme", libelle: "Système" }, { valeur: "clair", libelle: "Clair" }, { valeur: "sombre", libelle: "Sombre" }];

/** Clair, sombre, ou comme le Mac. Appliqué tout de suite, retenu pour la prochaine fois. */
export function Apparence({ initial }: { initial: Theme }) {
  const router = useRouter();
  const [theme, setTheme] = useState(initial);
  const choisir = (t: Theme) => {
    setTheme(t);
    appliquerTheme(t);
    router.refresh();
  };
  return (
    <section>
      <header className="border-b border-accent pb-2.5"><h2 className="text-xl font-medium tracking-tight">Apparence</h2></header>
      <div role="radiogroup" aria-label="Apparence" className="mt-4 flex w-fit gap-0.5 rounded-md border border-bord-faible p-0.5">
        {CHOIX.map((c) => (
          <button key={c.valeur} role="radio" aria-checked={theme === c.valeur} onClick={() => choisir(c.valeur)}
            className={`rounded px-3.5 py-1.5 text-[15px] ${theme === c.valeur ? "bg-bord-2 text-texte" : "text-texte-sourd hover:text-texte"}`}>{c.libelle}</button>
        ))}
      </div>
      <p className="mt-2.5 text-[13.5px] text-texte-sourd">« Système » suit le réglage du Mac.</p>
    </section>
  );
}

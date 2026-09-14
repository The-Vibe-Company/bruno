"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { modifierTache, rouvrir, supprimer, type Patch } from "@/board/api";
import { Detail, type TacheFiche } from "@/board/Detail";
import type { Membre } from "@/board/Carte";
import { Semaine, type Semaine as SemaineFaite } from "./Semaine";

/**
 * L'historique, et la fiche qui s'ouvre dessus : une Tâche finie garde ses Notes, ses Aidants et
 * ses Reports — c'est là qu'on vient les relire, des semaines plus tard.
 */
export function Historique({ semaines, membres, fiches }: { semaines: SemaineFaite[]; membres: Membre[]; fiches: TacheFiche[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const parId = useMemo(() => new Map(fiches.map((f) => [f.id, f])), [fiches]);

  const rafraichir = () => demarrer(() => router.refresh());
  const agir = (fn: (id: string) => Promise<unknown>) => async (id: string) => {
    setErreur(null);
    try { await fn(id); } catch (e) { setErreur((e as Error).message); }
    rafraichir();
  };

  return (
    <>
      {erreur && (
        <p role="alert" className="mb-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">
          {erreur} <button className="ml-2 underline" onClick={() => setErreur(null)}>ok</button>
        </p>
      )}
      {semaines.map((s) => <Semaine key={s.lundi} semaine={s} membres={membres} onOuvrir={setOuverteId} />)}
      <Detail
        tache={ouverteId ? parId.get(ouverteId) ?? null : null}
        membres={membres}
        onFermer={() => setOuverteId(null)}
        onModifier={async (id: string, patch: Patch) => { await agir(() => modifierTache(id, patch))(id); }}
        onRouvrir={async (id: string) => { await agir(rouvrir)(id); setOuverteId(null); }}
        onTerminer={async () => {}}
        onAbandonner={async () => {}}
        onSupprimer={async (id: string) => { await agir(supprimer)(id); setOuverteId(null); }}
      />
    </>
  );
}

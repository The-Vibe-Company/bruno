"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Chevron, Choix } from "@/board/Choix";
import { Initiale } from "@/board/visuel";
import { JOURS, libelleEngagement, occurrencesDe, prochaineDate, type Frequence } from "./regle";

export type Membre = { id: string; nom: string };
export type Brouillon = { id: string | null; titre: string; assigneId: string; frequence: Frequence; jourSemaine: number; jourMois: number; decalages: number[] };

const CHOIX_FREQUENCE = [...JOURS.map((j, i) => ({ valeur: `h${i + 1}`, libelle: `Chaque ${j}` })), ...Array.from({ length: 28 }, (_, i) => ({ valeur: `m${i + 1}`, libelle: `Le ${i + 1} du mois` }))];

/**
 * L'édition d'une règle : titre, Assigné (obligatoire), fréquence, nombre d'occurrences, et
 * les Engagements échelonnés — avec l'aperçu de ce que la règle fabriquera, titres numérotés
 * compris. Ce qu'on voit ici est exactement ce que le moteur fera.
 */
export function Editeur({ initial, membres, aujourdhui }: { initial: Brouillon; membres: Membre[]; aujourdhui: string }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [b, setB] = useState(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const regle = { ...b, jourSemaine: b.frequence === "hebdomadaire" ? b.jourSemaine : null, jourMois: b.frequence === "mensuelle" ? b.jourMois : null };
  const base = prochaineDate(regle, aujourdhui);
  const apercu = occurrencesDe(regle, base);
  const frequence = b.frequence === "hebdomadaire" ? `h${b.jourSemaine}` : `m${b.jourMois}`;

  const poserFrequence = (v: string) => setB({ ...b, frequence: v[0] === "h" ? "hebdomadaire" : "mensuelle", ...(v[0] === "h" ? { jourSemaine: Number(v.slice(1)) } : { jourMois: Number(v.slice(1)) }) });
  const poserNombre = (n: number) => {
    const d = b.decalages.slice(0, n);
    while (d.length < n) d.push((d[d.length - 1] ?? -2) + 2);
    setB({ ...b, decalages: d });
  };
  const poserDecalage = (i: number, v: number) => setB({ ...b, decalages: b.decalages.map((d, j) => (j === i ? v : d)) });

  async function envoyer(methode: "POST" | "PUT" | "DELETE") {
    setOccupe(true); setErreur(null);
    try {
      const r = await fetch(b.id ? `/api/recurrences/${b.id}` : "/api/recurrences", {
        method: methode, headers: methode === "DELETE" ? undefined : { "content-type": "application/json" },
        body: methode === "DELETE" ? undefined : JSON.stringify({ titre: b.titre, assigneId: b.assigneId, frequence: b.frequence, jourSemaine: regle.jourSemaine ?? undefined, jourMois: regle.jourMois ?? undefined, decalages: b.decalages }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.details?.[0]?.message ?? e.message ?? `Erreur ${r.status}`); }
      const cible = methode === "DELETE" ? "/recurrences" : `/recurrences?regle=${(await r.json()).id}`;
      demarrer(() => { router.push(cible); router.refresh(); });
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  }

  const champ = "h-10 w-full border-b border-bord-faible bg-transparent text-[15.5px] outline-none focus:border-accent";
  return (
    <form className="flex max-w-[760px] flex-col gap-8 px-10 py-7" onSubmit={(e) => { e.preventDefault(); envoyer(b.id ? "PUT" : "POST"); }}>
      <h2 className="text-[28px] font-medium tracking-tight">{b.titre.trim() || (b.id ? "Règle" : "Nouvelle règle")}</h2>
      {erreur && <p role="alert" className="rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}
      <div className="grid grid-cols-2 gap-x-10 gap-y-5">
        <label className="flex flex-col gap-1.5"><span className="text-[13px] text-texte-sourd">Titre</span>
          <input value={b.titre} onChange={(e) => setB({ ...b, titre: e.target.value })} placeholder="Post LinkedIn" className={champ} required maxLength={200} /></label>
        <div className="flex flex-col gap-1.5"><span className="flex justify-between text-[13px] text-texte-sourd">Assigné<span className="text-texte-faible">obligatoire</span></span>
          <Choix valeur={b.assigneId} onChoisir={(id) => setB({ ...b, assigneId: id })} options={membres.map((m) => ({ valeur: m.id, libelle: m.nom, pastille: <Initiale nom={m.nom} /> }))}>
            <button type="button" className={`${champ} flex items-center gap-2 text-left`}><Initiale nom={membres.find((m) => m.id === b.assigneId)?.nom ?? "?"} /><span className="flex-1">{membres.find((m) => m.id === b.assigneId)?.nom ?? "—"}</span><Chevron /></button>
          </Choix></div>
        <div className="flex flex-col gap-1.5"><span className="text-[13px] text-texte-sourd">Fréquence</span>
          <Choix valeur={frequence} onChoisir={poserFrequence} options={CHOIX_FREQUENCE}>
            <button type="button" className={`${champ} flex items-center gap-2 text-left`}><span className="flex-1">{CHOIX_FREQUENCE.find((c) => c.valeur === frequence)?.libelle}</span><Chevron /></button>
          </Choix></div>
        <label className="flex flex-col gap-1.5"><span className="flex justify-between text-[13px] text-texte-sourd">Nombre d’occurrences<span className="text-texte-faible">n/N automatique</span></span>
          <input type="number" min={1} max={12} value={b.decalages.length} onChange={(e) => poserNombre(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} className={champ} /></label>
      </div>
      <section>
        <header className="flex items-baseline justify-between border-b border-bord-faible pb-2.5"><h3 className="text-xl font-medium tracking-tight">Engagements échelonnés</h3><span className="text-sm text-texte-sourd">à partir du {base.split("-").reverse().join("/")}</span></header>
        {apercu.map((o, i) => (
          <div key={o.numero} className="grid grid-cols-[40px_1fr_auto_auto] items-baseline gap-3 border-b border-bord-2 py-3">
            <span className="text-sm text-accent">{b.decalages.length > 1 ? `${o.numero}/${b.decalages.length}` : "1"}</span>
            <span className="text-[15.5px]">{o.titre}</span>
            <span className="text-sm text-texte-sourd">{libelleEngagement(regle, base, o.engagement)}</span>
            {i === 0 ? <span className="w-[86px] text-right text-[13px] text-texte-faible">le jour même</span> : (
              <label className="flex items-center gap-1.5 text-[13px] text-texte-sourd">+<input type="number" min={b.decalages[i - 1] + 1} max={366} value={b.decalages[i]} aria-label={`Décalage de l’occurrence ${o.numero}`}
                onChange={(e) => poserDecalage(i, Math.max(b.decalages[i - 1] + 1, Number(e.target.value) || 0))} className="h-8 w-14 rounded-md border border-bord-faible bg-transparent px-2 text-right text-texte outline-none focus:border-accent" /> j</label>
            )}
          </div>
        ))}
      </section>
      <div className="mt-auto flex gap-2.5">
        <button type="submit" disabled={occupe || !b.titre.trim()} className="h-9 rounded-md bg-accent px-3.5 text-sm font-medium text-sur-accent disabled:opacity-50">Enregistrer</button>
        {b.id && <button type="button" disabled={occupe} onClick={() => envoyer("DELETE")} className="h-9 rounded-md border border-bord-faible px-3.5 text-sm text-texte-sourd hover:text-texte">Supprimer la règle</button>}
      </div>
    </form>
  );
}

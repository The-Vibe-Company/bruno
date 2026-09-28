"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Entree } from "@/api/journal";
import { Initiale } from "@/board/visuel";

async function appel(chemin: string, method: string, corps?: unknown) {
  const r = await fetch(chemin, { method, headers: corps ? { "content-type": "application/json" } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

/** « aujourd'hui à 14:12 », « 12 septembre à 09:40 » — quand ça s'est dit. */
function quand(iso: string): string {
  const d = new Date(iso);
  const jour = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const memeJour = new Date().toDateString() === d.toDateString();
  return `${memeJour ? "aujourd’hui" : jour} à ${heure}`;
}

/**
 * Ce qu'on note sur une Affectation, du plus récent au plus ancien. On ajoute, on n'édite pas :
 * un journal qu'on réécrit ne vaut plus rien. Chacun peut effacer ce qu'il a écrit lui-même.
 *
 * L'entrée s'affiche avant que le serveur réponde — comme partout ailleurs dans Bruno.
 */
export function Journal({ affectationId, initiales }: { affectationId: string; initiales: Entree[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [base, setBase] = useState(initiales);
  const [liste, setListe] = useState(initiales);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  if (base !== initiales) { setBase(initiales); setListe(initiales); }

  const ecrire = async () => {
    const dit = texte.trim();
    if (!dit) return;
    const provisoire: Entree = { id: `provisoire-${crypto.randomUUID()}`, texte: dit, quand: new Date().toISOString(), auteur: null, deMoi: true };
    setListe((l) => [provisoire, ...l]);
    setTexte(""); setErreur(null);
    try { await appel(`/api/affectations/${affectationId}/journal`, "POST", { texte: dit }); }
    catch (e) { setErreur((e as Error).message); setListe((l) => l.filter((x) => x.id !== provisoire.id)); setTexte(dit); }
    demarrer(() => router.refresh());
  };

  const effacer = async (id: string) => {
    setListe((l) => l.filter((x) => x.id !== id));
    setErreur(null);
    try { await appel(`/api/journal/${id}`, "DELETE"); }
    catch (e) { setErreur((e as Error).message); }
    demarrer(() => router.refresh());
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2 py-4">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ecrire(); } }}
          placeholder="Où en est-on avec eux ?" aria-label="Écrire au journal"
          className="min-h-[46px] flex-1 resize-y rounded-lg border border-bord-fort bg-fond px-3 py-2.5 text-[14.5px] outline-none placeholder:text-texte-faible focus:border-accent" />
        <button onClick={ecrire} disabled={!texte.trim()} className="h-[46px] rounded-lg bg-accent px-4 text-[14px] font-medium text-sur-accent disabled:opacity-50">Noter</button>
      </div>
      {erreur && <p role="alert" className="mb-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}

      {liste.length === 0 && <p className="py-2 text-[13.5px] text-texte-faible">Rien encore. La première ligne sera la plus utile dans six mois.</p>}
      {liste.map((e) => {
        const provisoire = e.id.startsWith("provisoire-");
        return (
          <article key={e.id} className={`group flex gap-3 border-t border-bord-2 py-3.5 ${provisoire ? "opacity-60" : ""}`}>
            <span className="pt-0.5">{e.auteur ? <Initiale nom={e.auteur.nom} avatar={e.auteur.avatar} grande /> : <Initiale nom="?" />}</span>
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed">{e.texte}</p>
              <p className="mt-1 text-[12px] text-texte-faible">{e.auteur?.nom ?? "moi"} · {quand(e.quand)}</p>
            </div>
            {!provisoire && e.deMoi && (
              <button onClick={() => effacer(e.id)} aria-label="Effacer cette entrée"
                className="h-5 flex-none text-[12px] text-texte-faible opacity-0 transition-opacity hover:text-bloque group-hover:opacity-100">
                effacer
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

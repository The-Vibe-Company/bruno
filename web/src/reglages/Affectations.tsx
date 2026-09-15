"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PALETTE } from "./palette";

export type Affectation = { id: string; nom: string; couleur: string; actif: boolean; periodes: number };

/** Les mots changent, les gestes non : une Affectation et un Projet se gèrent pareil. */
export type Vocabulaire = { titre: string; chemin: string; un: string; le: string; ajouter: string; la: string; e: string };
export const AFFECTATIONS: Vocabulaire = { titre: "Affectations", chemin: "/api/affectations", un: "une Affectation", le: "l’", ajouter: "+ Ajouter une Affectation", la: "la", e: "e" };
export const PROJETS: Vocabulaire = { titre: "Projets", chemin: "/api/projets", un: "un Projet", le: "le ", ajouter: "+ Ajouter un Projet", la: "le", e: "" };

/**
 * Ce qu'on perd en supprimant. Le compte vient du serveur : dire « des périodes » sans le nombre
 * laissait croire que c'était une formalité.
 */
function consequence(periodes: number, mots: Vocabulaire): string {
  if (periodes === 0) return "Personne n’a jamais été dessus : rien d’autre ne disparaît.";
  const [n, part] = periodes === 1 ? ["Une période", "elle part"] : [`${periodes} périodes`, "elles partent"];
  return `${n} ${mots.la} nomme${periodes === 1 ? "" : "nt"} : ${part} avec, et l’historique ne dira plus qui était dessus. Pour l’enlever sans rien perdre, désactivez-${mots.la}.`;
}

async function appel(chemin: string, method: string, corps?: unknown): Promise<Affectation[]> {
  const r = await fetch(chemin, { method, headers: corps ? { "content-type": "application/json" } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

/**
 * La liste de ce à quoi on peut travailler — les Affectations, ou les Projets : même écran, même
 * code. Désactiver reste le geste normal ; supprimer efface aussi les périodes, et la boîte de
 * confirmation le dit avec le compte. Qui est sur quoi ne se règle pas ici : ça se change là où
 * c'est affiché.
 */
export function Affectations({ initiales, mots = AFFECTATIONS, titre = true }: { initiales: Affectation[]; mots?: Vocabulaire; titre?: boolean }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [liste, setListe] = useState(initiales);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [couleur, setCouleur] = useState(PALETTE[1]);

  const agir = async (fn: () => Promise<Affectation[]>) => {
    setErreur(null);
    try { setListe(await fn()); return true; } catch (e) { setErreur((e as Error).message); return false; }
    finally { demarrer(() => router.refresh()); }
  };

  return (
    <section>
      {titre && <header className="border-b border-accent pb-2.5"><h2 className="text-xl font-medium tracking-tight">{mots.titre}</h2></header>}
      {erreur && <p role="alert" className="mt-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}
      <ul>
        {liste.map((a) => (
          <li key={a.id} className="flex items-center gap-3.5 border-b border-bord-2 py-3.5">
            <span className="h-5 w-1" style={{ background: a.couleur }} />
            <span className={`flex-1 text-[15.5px] ${a.actif ? "" : "text-texte-faible"}`}>{a.nom}{!a.actif && <span className="text-[13.5px]"> · désactivé{mots.e}</span>}</span>
            <button onClick={() => agir(() => appel(`${mots.chemin}/${a.id}`, "PATCH", { actif: !a.actif }))} className="text-[13.5px] text-texte-sourd hover:text-texte">
              {a.actif ? "Désactiver" : "Réactiver"}
            </button>
            <AlertDialog.Root>
              <AlertDialog.Trigger asChild><button className="text-[13.5px] text-texte-faible hover:text-bloque">Supprimer</button></AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="anime-voile fixed inset-0 bg-fond-page/60" />
                <AlertDialog.Content className="anime-boite fixed left-1/2 top-1/2 w-[400px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-bord bg-surface p-5 shadow-2xl outline-none">
                  <AlertDialog.Title className="text-lg font-semibold tracking-tight">Supprimer « {a.nom} » ?</AlertDialog.Title>
                  <AlertDialog.Description className="mt-2 text-[14.5px] text-texte-sourd">
                    {consequence(a.periodes, mots)}
                  </AlertDialog.Description>
                  <div className="mt-5 flex justify-end gap-2">
                    <AlertDialog.Cancel asChild><button className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Annuler</button></AlertDialog.Cancel>
                    <AlertDialog.Action asChild><button onClick={() => agir(() => appel(`${mots.chemin}/${a.id}`, "DELETE"))} className="h-10 rounded-lg bg-bloque px-4 text-[14.5px] font-medium text-sur-accent">Supprimer</button></AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </li>
        ))}
      </ul>
      {ajout ? (
        <form className="flex items-center gap-2.5 py-3" onSubmit={async (e) => { e.preventDefault(); if (await agir(() => appel(mots.chemin, "POST", { nom, couleur }))) { setNom(""); setAjout(false); } }}>
          <span className="flex gap-1.5" role="radiogroup" aria-label="Couleur">
            {PALETTE.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={couleur === c} aria-label={c} onClick={() => setCouleur(c)}
                className={`h-5 w-5 rounded-full ring-offset-2 ring-offset-fond ${couleur === c ? "ring-2 ring-texte" : ""}`} style={{ background: c }} />
            ))}
          </span>
          <input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" aria-label="Nom" maxLength={40}
            className="h-10 flex-1 rounded-lg border border-bord-fort bg-fond px-3 text-[15px] outline-none focus:border-accent" />
          <button type="submit" disabled={!nom.trim()} className="h-10 rounded-lg bg-accent px-4 text-[14.5px] font-medium text-sur-accent disabled:opacity-50">Ajouter</button>
          <button type="button" onClick={() => setAjout(false)} className="h-10 px-2 text-sm text-texte-sourd">Annuler</button>
        </form>
      ) : (
        <button onClick={() => setAjout(true)} className="py-3.5 text-[15px] text-accent hover:text-accent-survol">{mots.ajouter}</button>
      )}
    </section>
  );
}

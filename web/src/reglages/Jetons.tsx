"use client";
import { useState } from "react";
import type { JetonApi } from "@/api/contrat";

async function appel<T>(chemin: string, method: string, corps?: unknown): Promise<T> {
  const r = await fetch(chemin, {
    method,
    headers: corps ? { "content-type": "application/json" } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

function quand(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Les jetons personnels, à côté du compte. Créer, nommer, révoquer.
 * Le secret s'affiche une fois — la base n'en garde que l'empreinte.
 */
export function Jetons({ initiaux }: { initiaux: JetonApi[] }) {
  const [liste, setListe] = useState(initiaux);
  const [nom, setNom] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const creer = async () => {
    setErreur(null); setOccupe(true); setCopie(false);
    try {
      const emis = await appel<JetonApi & { jeton: string }>("/api/jetons", "POST", { nom });
      setSecret(emis.jeton);
      setNom("");
      const pose = { id: emis.id, nom: emis.nom, creeLe: emis.creeLe, revoqueLe: emis.revoqueLe, dernierUsage: emis.dernierUsage };
      setListe((courante) => [pose, ...courante.filter((j) => j.id !== pose.id)]);
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  const revoquer = async (id: string) => {
    setErreur(null);
    try { setListe(await appel<JetonApi[]>(`/api/jetons/${id}/revoquer`, "POST")); }
    catch (e) { setErreur((e as Error).message); }
  };

  const copier = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopie(true);
    } catch { setErreur("La copie a échoué : sélectionnez le jeton."); }
  };

  return (
    <section>
      <header className="border-b border-accent pb-2.5"><h2 className="text-xl font-medium tracking-tight">Jetons</h2></header>
      <p className="mt-3.5 text-[14.5px] leading-relaxed text-texte-sourd">
        Pour qu’un agent agisse en votre nom — Grok, Claude, Cursor. Le jeton ne s’affiche qu’une fois. Le révoquer coupe l’accès tout de suite.
      </p>

      {erreur && <p role="alert" className="mt-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}

      {secret && (
        <div className="mt-3 rounded-lg border border-bord-fort bg-fond px-3 py-3">
          <p className="text-[14.5px]">Copiez-le maintenant. Bruno ne le garde pas.</p>
          <p className="mt-2 break-all font-mono text-[13px]">{secret}</p>
          <button type="button" onClick={copier} className="mt-2 text-[13.5px] text-accent hover:text-accent-survol">{copie ? "Copié" : "Copier"}</button>
        </div>
      )}

      <form className="mt-4 flex items-center gap-2.5" onSubmit={(e) => { e.preventDefault(); if (nom.trim()) creer(); }}>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Grok de Stan" aria-label="Nom du jeton" maxLength={80}
          className="h-10 flex-1 rounded-lg border border-bord-fort bg-fond px-3 text-[15px] outline-none focus:border-accent" />
        <button type="submit" disabled={occupe || !nom.trim()} className="h-10 rounded-lg bg-accent px-4 text-[14.5px] font-medium text-sur-accent disabled:opacity-50">
          {occupe ? "…" : "Créer"}
        </button>
      </form>

      {liste.length > 0 && (
        <ul className="mt-2">
          {liste.map((j) => (
            <li key={j.id} className="flex items-center gap-3 border-b border-bord-2 py-3">
              <span className="flex-1">
                <span className="block text-[15.5px]">{j.nom}</span>
                <span className="block text-[13px] text-texte-sourd">
                  créé le {quand(j.creeLe)}
                  {j.revoqueLe ? ` · révoqué le ${quand(j.revoqueLe)}` : j.dernierUsage ? ` · utilisé le ${quand(j.dernierUsage)}` : " · pas encore utilisé"}
                </span>
              </span>
              {j.revoqueLe
                ? <span className="text-[13.5px] text-texte-faible">révoqué</span>
                : <button onClick={() => revoquer(j.id)} className="text-[13.5px] text-texte-sourd hover:text-texte">Révoquer</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

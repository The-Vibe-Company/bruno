"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Vignette } from "@/api/fichiers";

/** Ce que le serveur accepte. On le dit avant d'envoyer : un refus après coup est une perte de temps. */
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const POIDS_MAX = 20 * 1024 * 1024;
const poids = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

type EnVol = { cle: string; apercu: string | null; nom: string };

/**
 * Les fichiers d'une Tâche : une capture d'écran, une photo d'un tableau blanc, un devis en PDF.
 *
 * Trois façons de les poser, parce qu'on ne s'y prend jamais pareil : coller (c'est le geste
 * après une capture d'écran), déposer, ou choisir. La vignette apparaît avant que le serveur
 * réponde — on vient de la voir, elle ne doit pas disparaître le temps d'un envoi.
 */
export function Fichiers({ tacheId }: { tacheId: string }) {
  const [liste, setListe] = useState<Vignette[] | null>(null);
  const [enVol, setEnVol] = useState<EnVol[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`/api/taches/${tacheId}/fichiers`).then((r) => r.json()).then((l: Vignette[]) => { if (vivant) setListe(l); }).catch(() => {});
    return () => { vivant = false; };
  }, [tacheId]);

  const envoyer = useCallback(async (fichiers: File[]) => {
    const bons = fichiers.filter((f) => TYPES.includes(f.type));
    if (bons.length < fichiers.length) setErreur("Une image (PNG, JPEG, WebP, GIF) ou un PDF.");
    for (const f of bons) {
      if (f.size > POIDS_MAX) { setErreur(`« ${f.name} » pèse ${poids(f.size)} — vingt mégaoctets au plus.`); continue; }
      const attente: EnVol = { cle: crypto.randomUUID(), apercu: f.type.startsWith("image/") ? URL.createObjectURL(f) : null, nom: f.name };
      setEnVol((e) => [...e, attente]);
      try {
        const r = await fetch(`/api/taches/${tacheId}/fichiers`, {
          method: "POST", headers: { "content-type": f.type, "x-nom": encodeURIComponent(f.name) }, body: f,
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
        setListe(await r.json());
        setErreur(null);
      } catch (e) { setErreur((e as Error).message); }
      finally {
        setEnVol((v) => v.filter((x) => x.cle !== attente.cle));
        if (attente.apercu) URL.revokeObjectURL(attente.apercu);
      }
    }
  }, [tacheId]);

  // Coller : le geste juste après une capture d'écran. La fiche écoute tant qu'elle est ouverte.
  useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])];
      if (f.length) { e.preventDefault(); void envoyer(f); }
    };
    document.addEventListener("paste", coller);
    return () => document.removeEventListener("paste", coller);
  }, [envoyer]);

  const retirer = async (id: string) => {
    setListe((l) => (l ?? []).filter((i) => i.id !== id));
    try { await fetch(`/api/fichiers/${id}`, { method: "DELETE" }); } catch (e) { setErreur((e as Error).message); }
  };

  const tous = liste ?? [];
  const images = tous.filter((f) => f.estImage);
  const documents = tous.filter((f) => !f.estImage);
  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); void envoyer([...e.dataTransfer.files]); }}
      className={`rounded-lg border border-dashed p-2 transition-colors ${survol ? "border-accent bg-accent-voile" : "border-transparent"}`}>
      <div className="flex items-center gap-2 pb-1.5">
        <span className="text-sm text-texte-sourd">Fichiers</span>
        <button onClick={() => champ.current?.click()} className="text-[12.5px] text-accent hover:text-accent-survol">ajouter</button>
        <span className="text-[12px] text-texte-faible">ou colle, ou dépose</span>
        <input ref={champ} type="file" accept={TYPES.join(",")} multiple hidden
          onChange={(e) => { void envoyer([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      {erreur && <p role="alert" className="pb-2 text-[12.5px] text-bloque">{erreur}</p>}
      {tous.length === 0 && enVol.length === 0 && (
        <p className="text-[13px] text-texte-faible">Une capture d’écran vaut souvent trois phrases de Notes.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {images.map((f) => (
          <span key={f.id} className="group relative">
            <a href={`/api/fichiers/${f.id}`} target="_blank" rel="noreferrer" title={`${f.nom} · ${poids(f.octets)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- servie par Bruno, taille libre */}
              <img src={`/api/fichiers/${f.id}`} alt={f.nom} className="h-20 w-20 rounded-lg border border-bord-2 object-cover" />
            </a>
            <Croix onClick={() => retirer(f.id)} nom={f.nom} />
          </span>
        ))}
        {enVol.filter((v) => v.apercu).map((v) => (
          /* eslint-disable-next-line @next/next/no-img-element -- l'aperçu local, le temps de l'envoi */
          <img key={v.cle} src={v.apercu!} alt={v.nom} className="h-20 w-20 animate-pulse rounded-lg border border-bord-2 object-cover opacity-50" />
        ))}
      </div>

      {documents.map((f) => (
        <div key={f.id} className="group relative mt-1.5 flex items-center gap-2 rounded-lg border border-bord-2 px-2.5 py-2">
          <IconePdf />
          <a href={`/api/fichiers/${f.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[13.5px] hover:text-accent">{f.nom}</a>
          <span className="flex-none text-[12px] text-texte-faible">{poids(f.octets)}</span>
          <Croix onClick={() => retirer(f.id)} nom={f.nom} />
        </div>
      ))}
      {enVol.filter((v) => !v.apercu).map((v) => (
        <div key={v.cle} className="mt-1.5 flex animate-pulse items-center gap-2 rounded-lg border border-bord-2 px-2.5 py-2 opacity-50">
          <IconePdf /><span className="truncate text-[13.5px]">{v.nom}</span>
        </div>
      ))}
    </section>
  );
}

const IconePdf = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="flex-none text-texte-sourd" aria-hidden="true">
    <path d="M8 1.5H3.5v11h7V4z" /><path d="M8 1.5V4h2.5" />
  </svg>
);

function Croix({ onClick, nom }: { onClick: () => void; nom: string }) {
  return (
    <button onClick={onClick} aria-label={`Retirer ${nom}`}
      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-bord-fort bg-surface text-texte-sourd opacity-0 transition-opacity hover:text-bloque group-hover:opacity-100">
      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l8 8M10 2l-8 8" /></svg>
    </button>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Vignette } from "@/api/images";

/** Ce que le serveur accepte : des images, cinq mégaoctets au plus. On le dit avant d'envoyer. */
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const POIDS_MAX = 5 * 1024 * 1024;
const poids = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

type EnVol = { cle: string; apercu: string; nom: string };

/**
 * Les images d'une Tâche : une capture d'écran, une photo d'un tableau blanc, une maquette.
 *
 * Trois façons de les poser, parce qu'on ne s'y prend jamais pareil : coller (c'est le geste
 * après une capture d'écran), déposer, ou choisir un fichier. La vignette apparaît avant que le
 * serveur réponde — on vient de la voir, elle ne doit pas disparaître le temps d'un envoi.
 */
export function Images({ tacheId }: { tacheId: string }) {
  const [liste, setListe] = useState<Vignette[] | null>(null);
  const [enVol, setEnVol] = useState<EnVol[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const champ = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`/api/taches/${tacheId}/images`).then((r) => r.json()).then((l: Vignette[]) => { if (vivant) setListe(l); }).catch(() => {});
    return () => { vivant = false; };
  }, [tacheId]);

  const envoyer = useCallback(async (fichiers: File[]) => {
    const bonnes = fichiers.filter((f) => TYPES.includes(f.type));
    if (bonnes.length < fichiers.length) setErreur("Des images seulement : PNG, JPEG, WebP ou GIF.");
    for (const f of bonnes) {
      if (f.size > POIDS_MAX) { setErreur(`« ${f.name} » pèse ${poids(f.size)} — cinq mégaoctets au plus.`); continue; }
      const attente: EnVol = { cle: crypto.randomUUID(), apercu: URL.createObjectURL(f), nom: f.name };
      setEnVol((e) => [...e, attente]);
      try {
        const r = await fetch(`/api/taches/${tacheId}/images`, {
          method: "POST", headers: { "content-type": f.type, "x-nom": encodeURIComponent(f.name) }, body: f,
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
        setListe(await r.json());
        setErreur(null);
      } catch (e) { setErreur((e as Error).message); }
      finally {
        setEnVol((v) => v.filter((x) => x.cle !== attente.cle));
        URL.revokeObjectURL(attente.apercu);
      }
    }
  }, [tacheId]);

  // Coller : le geste juste après une capture d'écran. La fiche écoute tant qu'elle est ouverte.
  useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const fichiers = [...(e.clipboardData?.files ?? [])];
      if (fichiers.length) { e.preventDefault(); void envoyer(fichiers); }
    };
    document.addEventListener("paste", coller);
    return () => document.removeEventListener("paste", coller);
  }, [envoyer]);

  const retirer = async (id: string) => {
    setListe((l) => (l ?? []).filter((i) => i.id !== id));
    try { await fetch(`/api/images/${id}`, { method: "DELETE" }); } catch (e) { setErreur((e as Error).message); }
  };

  const vignettes = liste ?? [];
  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); void envoyer([...e.dataTransfer.files]); }}
      className={`rounded-lg border border-dashed p-2 transition-colors ${survol ? "border-accent bg-accent-voile" : "border-transparent"}`}>
      <div className="flex items-center gap-2 pb-1.5">
        <span className="text-sm text-texte-sourd">Images</span>
        <button onClick={() => champ.current?.click()} className="text-[12.5px] text-accent hover:text-accent-survol">ajouter</button>
        <span className="text-[12px] text-texte-faible">ou colle, ou dépose</span>
        <input ref={champ} type="file" accept={TYPES.join(",")} multiple hidden
          onChange={(e) => { void envoyer([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      {erreur && <p role="alert" className="pb-2 text-[12.5px] text-bloque">{erreur}</p>}
      {vignettes.length === 0 && enVol.length === 0 && (
        <p className="text-[13px] text-texte-faible">Une capture d’écran vaut souvent trois phrases de Notes.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {vignettes.map((i) => (
          <span key={i.id} className="group relative">
            <a href={`/api/images/${i.id}`} target="_blank" rel="noreferrer" title={`${i.nom} · ${poids(i.octets)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- servie par Bruno, taille libre */}
              <img src={`/api/images/${i.id}`} alt={i.nom} className="h-20 w-20 rounded-lg border border-bord-2 object-cover" />
            </a>
            <button onClick={() => retirer(i.id)} aria-label={`Retirer ${i.nom}`}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-bord-fort bg-surface text-texte-sourd opacity-0 transition-opacity hover:text-bloque group-hover:opacity-100">
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </span>
        ))}
        {enVol.map((v) => (
          /* eslint-disable-next-line @next/next/no-img-element -- l'aperçu local, le temps de l'envoi */
          <img key={v.cle} src={v.apercu} alt={v.nom} className="h-20 w-20 animate-pulse rounded-lg border border-bord-2 object-cover opacity-50" />
        ))}
      </div>
    </section>
  );
}

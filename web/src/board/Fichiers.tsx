"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Vignette } from "@/api/fichiers";

/** Ce que le serveur accepte. On le dit avant d'envoyer : un refus après coup est une perte de temps. */
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const POIDS_MAX = 20 * 1024 * 1024;
const poids = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

type EnVol = { cle: string; apercu: string | null; nom: string };

export type Depot = ReturnType<typeof useDepot>;

/**
 * Ce qu'une Tâche garde avec elle. Un seul état, montré à deux endroits : la liste dans le corps
 * de la fiche, le bouton au ras du bas, toujours sous la main même quand on a fait défiler.
 */
export function useDepot(tacheId: string) {
  const [liste, setListe] = useState<Vignette[] | null>(null);
  const [enVol, setEnVol] = useState<EnVol[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`/api/taches/${tacheId}/fichiers`).then((r) => r.json()).then((l: Vignette[]) => { if (vivant) setListe(l); }).catch(() => {});
    return () => { vivant = false; };
  }, [tacheId]);

  const envoyer = useCallback(async (fichiers: File[]) => {
    const bons = fichiers.filter((f) => TYPES.includes(f.type));
    if (bons.length < fichiers.length) setErreur("Une image ou un PDF.");
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

  /*
   * Déposer : la fenêtre entière, pas un carré à viser. Rater la fiche de trois pixels faisait
   * ouvrir le fichier par le navigateur — la page partait, et le geste avait l'air cassé. Tant
   * qu'une fiche est ouverte, un fichier lâché n'importe où lui revient, et rien d'autre ne
   * l'attrape. Le panneau s'éclaire pour dire qui le reçoit.
   */
  useEffect(() => {
    const panneau = document.querySelector<HTMLElement>("[data-fiche]");
    const desFichiers = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
    let compte = 0;
    const eteindre = () => { compte = 0; if (panneau) delete panneau.dataset.depot; };
    const entre = (e: DragEvent) => { if (!desFichiers(e)) return; e.preventDefault(); compte += 1; if (panneau) panneau.dataset.depot = "oui"; };
    const sort = (e: DragEvent) => { if (!desFichiers(e)) return; compte -= 1; if (compte <= 0) eteindre(); };
    const dessus = (e: DragEvent) => { if (desFichiers(e)) e.preventDefault(); };
    const lache = (e: DragEvent) => { if (!desFichiers(e)) return; e.preventDefault(); eteindre(); void envoyer([...(e.dataTransfer?.files ?? [])]); };
    window.addEventListener("dragenter", entre); window.addEventListener("dragleave", sort);
    window.addEventListener("dragover", dessus); window.addEventListener("drop", lache);
    return () => {
      window.removeEventListener("dragenter", entre); window.removeEventListener("dragleave", sort);
      window.removeEventListener("dragover", dessus); window.removeEventListener("drop", lache);
      eteindre();
    };
  }, [envoyer]);

  const retirer = useCallback(async (id: string) => {
    setListe((l) => (l ?? []).filter((i) => i.id !== id));
    try { await fetch(`/api/fichiers/${id}`, { method: "DELETE" }); } catch (e) { setErreur((e as Error).message); }
  }, []);

  return { liste, enVol, erreur, envoyer, retirer };
}

/**
 * Les fichiers d'une Tâche : des objets, pas une rubrique. Pas de titre, pas de phrase
 * d'explication — une vignette se reconnaît, un PDF se lit à son nom.
 */
export function Fichiers({ depot }: { depot: Depot }) {
  const tous = depot.liste ?? [];
  const images = tous.filter((f) => f.estImage);
  const documents = tous.filter((f) => !f.estImage);
  if (tous.length === 0 && depot.enVol.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {(images.length > 0 || depot.enVol.some((v) => v.apercu)) && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((f) => (
            <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noreferrer" title={`${f.nom} · ${poids(f.octets)}`}
              className="group relative overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- servie par Bruno, taille libre */}
              <img src={`/api/fichiers/${f.id}`} alt={f.nom} className="h-[72px] w-[72px] object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
              <Croix onClick={(e) => { e.preventDefault(); depot.retirer(f.id); }} nom={f.nom} />
            </a>
          ))}
          {depot.enVol.filter((v) => v.apercu).map((v) => (
            /* eslint-disable-next-line @next/next/no-img-element -- l'aperçu local, le temps de l'envoi */
            <img key={v.cle} src={v.apercu!} alt={v.nom} className="h-[72px] w-[72px] animate-pulse rounded-lg object-cover opacity-40" />
          ))}
        </div>
      )}

      {documents.map((f) => (
        <a key={f.id} href={`/api/fichiers/${f.id}`} target="_blank" rel="noreferrer"
          className="group relative flex max-w-full items-center gap-2.5 self-start rounded-lg bg-surface-2 py-2 pl-2.5 pr-8 hover:bg-surface-3">
          <IconePdf />
          <span className="min-w-0 flex-1 truncate text-[14px]">{f.nom}</span>
          <span className="flex-none text-[12px] text-texte-faible">{poids(f.octets)}</span>
          <Croix onClick={(e) => { e.preventDefault(); depot.retirer(f.id); }} nom={f.nom} place="top-1/2 right-1 -translate-y-1/2" />
        </a>
      ))}
      {depot.enVol.filter((v) => !v.apercu).map((v) => (
        <div key={v.cle} className="flex max-w-full animate-pulse items-center gap-2.5 self-start rounded-lg bg-surface-2 py-2 pl-2.5 pr-8 opacity-50">
          <IconePdf /><span className="truncate text-[14px]">{v.nom}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Le bouton reste en bas, au-dessus du trait : quelles que soient la longueur des Notes et la
 * position du défilement, joindre un fichier est au même endroit.
 */
export function Joindre({ depot }: { depot: Depot }) {
  const champ = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 px-6 pb-3">
      <button onClick={() => champ.current?.click()}
        title="Une image ou un PDF — ou colle une capture, ou dépose-la n'importe où sur la fiche"
        className="flex flex-none items-center gap-1.5 rounded-md py-1 text-[13px] text-texte-faible hover:text-accent">
        <Trombone />Joindre un fichier
      </button>
      {depot.erreur && <p role="alert" className="min-w-0 flex-1 truncate text-[12.5px] text-bloque">{depot.erreur}</p>}
      <input ref={champ} type="file" accept={TYPES.join(",")} multiple hidden
        onChange={(e) => { void depot.envoyer([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </div>
  );
}

const Trombone = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="flex-none" aria-hidden="true">
    <path d="M9.5 4.5 5 9a1.8 1.8 0 1 0 2.5 2.5l4.2-4.2a3.2 3.2 0 1 0-4.5-4.5L2.8 7.2" />
  </svg>
);

const IconePdf = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" className="flex-none text-texte-sourd" aria-hidden="true">
    <path d="M8 1.5H3.5v11h7V4z" /><path d="M8 1.5V4h2.5" />
  </svg>
);

function Croix({ onClick, nom, place = "right-1 top-1" }: { onClick: (e: React.MouseEvent) => void; nom: string; place?: string }) {
  return (
    <button onClick={onClick} aria-label={`Retirer ${nom}`}
      className={`absolute ${place} flex h-5 w-5 items-center justify-center rounded-full bg-fond-page/80 text-texte-sourd opacity-0 backdrop-blur transition-opacity hover:text-bloque group-hover:opacity-100`}>
      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2l8 8M10 2l-8 8" /></svg>
    </button>
  );
}

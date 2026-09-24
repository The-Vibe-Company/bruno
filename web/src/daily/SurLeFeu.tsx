"use client";
import { DndContext, DragOverlay, PointerSensor, closestCorners, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { abandonner, appliquer, creerTache, deplacerBucket, modifierTache, reporter, rouvrir, supprimer, terminer, type Patch } from "@/board/api";
import { Blocage, type DemandeBlocage } from "@/board/Blocage";
import type { Membre, TacheCarte } from "@/board/Carte";
import { Detail, type TacheFiche } from "@/board/Detail";
import { NouvelleTache } from "@/board/NouvelleTache";
import { Report, type DemandeReport } from "@/board/Report";
import { Initiale, Meta, TEINTE } from "@/board/visuel";
import type { Statut } from "@/board/deplacement";
import { aujourdhui } from "@/lib/dates";

export type TacheDuJour = TacheCarte;

const STATUTS: Statut[] = ["a_faire", "en_cours", "bloque"];
const LIBELLE: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };
const COULEUR: Record<Statut, [string, string]> = { a_faire: ["bg-accent", "border-accent"], en_cours: ["bg-en-cours", "border-en-cours"], bloque: ["bg-bloque", "border-bloque"] };

/** Le pointeur d'abord : une colonne courte à côté d'une longue perdait sinon ses coins. Le même que sur le Board. */
const collision: CollisionDetection = (args) => {
  const sous = pointerWithin(args);
  return sous.length > 0 ? sous : closestCorners(args);
};

/**
 * Sur le feu aujourd'hui, groupé par Statut. Le Daily n'était qu'un écran à projeter ; on y
 * travaille maintenant — cocher, ouvrir la fiche, ajouter ce qui sort de la réunion. C'est là
 * qu'on parle des Tâches : devoir passer sur le Board pour les toucher n'avait pas de sens.
 *
 * Le glisser-déposer reste au Board : ici, le Statut se change dans la fiche.
 */
export function SurLeFeu({ taches, membres, assigneParDefaut }: {
  taches: TacheDuJour[]; membres: Membre[]; assigneParDefaut: string;
}) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  // L'écran bouge tout de suite ; le serveur confirme après. Quand il répond, c'est lui qui a raison.
  const [base, setBase] = useState(taches);
  const [liste, setListe] = useState(taches);
  const [provisoires, setProvisoires] = useState<TacheDuJour[]>([]);
  // Tant qu'une création est en route, on garde les cartes provisoires : sinon la deuxième ligne
  // tapée disparaîtrait le temps que la première revienne du serveur.
  const [enVol, setEnVol] = useState(0);
  if (base !== taches) { setBase(taches); setListe(taches); if (enVol === 0) setProvisoires([]); }

  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [demandeReport, setDemandeReport] = useState<DemandeReport>(null);
  const [demandeBlocage, setDemandeBlocage] = useState<DemandeBlocage>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<Statut | null>(null);

  /** Une action qui parle au serveur : l'écran a déjà bougé, on rattrape s'il refuse. */
  const agir = async (fn: () => Promise<unknown>) => {
    setErreur(null);
    setEnVol((n) => n + 1);
    try { await fn(); } catch (e) { setErreur((e as Error).message); }
    finally { setEnVol((n) => n - 1); demarrer(() => router.refresh()); }
  };

  const retirer = (id: string) => setListe((l) => l.filter((t) => t.id !== id));
  const toucher = (id: string, quoi: Partial<TacheDuJour>) => setListe((l) => l.map((t) => (t.id === id ? { ...t, ...quoi } : t)));

  const modifier = async (id: string, patch: Patch) => {
    toucher(id, patch as Partial<TacheDuJour>);
    await agir(() => modifierTache(id, patch));
  };
  const finir = (fn: (id: string) => Promise<void>) => async (id: string) => {
    retirer(id); setOuverteId(null);
    await agir(() => fn(id));
  };

  const poserStatut = (t: TacheFiche, statut: Statut) => {
    if (statut === t.statut) return;
    if (statut === "bloque") { setDemandeBlocage({ id: t.id, titre: t.titre, raison: null, mode: "bloquer" }); return; }
    toucher(t.id, { statut });
    agir(() => appliquer({ type: "statut", id: t.id, statut }));
  };
  const bloquer = async (id: string, raison: string, dependDeId: string | null) => {
    const modifie = demandeBlocage?.mode === "modifier";
    toucher(id, { statut: "bloque", raisonBlocage: raison });
    setDemandeBlocage(null);
    await agir(() => (modifie ? modifierTache(id, { raisonBlocage: raison, dependDeId }) : appliquer({ type: "statut", id, statut: "bloque", raison, dependDeId })));
  };

  /**
   * Ajouter ici, c'est ajouter Sur le feu aujourd'hui — le droit d'entrée est rempli d'office :
   * la date, c'est le jour même ; l'Assigné, la personne retenue par le filtre quand il n'y en a
   * qu'une, moi sinon. Deux appels : Bruno n'a pas de porte dérobée vers Sur le feu.
   */
  const creer = async (statut: Statut, titre: string) => {
    const provisoire: TacheDuJour = {
      id: `provisoire-${crypto.randomUUID()}`, titre, statut, engagement: aujourdhui(), reportsCount: 0,
      assigneId: assigneParDefaut, assigne: membres.find((m) => m.id === assigneParDefaut) ?? null,
      aidantIds: [], aidants: [], notes: null, transcriptionBrute: null, raisonBlocage: null,
    };
    setProvisoires((p) => [...p, provisoire]);
    await agir(async () => {
      const { id } = await creerTache(titre, "a_trier");
      await deplacerBucket(id, { bucket: "sur_le_feu", assigneId: assigneParDefaut, engagement: aujourdhui(), statut });
    });
  };

  const toutes = [...liste, ...provisoires];
  const fiche = (id: string): TacheFiche | null => {
    const t = toutes.find((x) => x.id === id);
    return t ? { ...t, bucket: "sur_le_feu", fin: null } : null;
  };

  /**
   * Glisser une carte d'une colonne à l'autre, comme sur le Board : c'est pendant le Daily qu'on
   * dit « je commence ça » ou « je suis bloqué ». Passer par la fiche pour ça faisait perdre le fil.
   * On ne réordonne pas ici — l'ordre est celui du Board, et le Daily ne fait que le lire.
   */
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [attrapee, setAttrapee] = useState<TacheDuJour | null>(null);
  const finDeGlisser = ({ active, over }: DragEndEvent) => {
    setAttrapee(null);
    const t = toutes.find((x) => x.id === String(active.id));
    const vers = over ? (String(over.id) as Statut) : null;
    if (!t || !vers || !STATUTS.includes(vers) || vers === t.statut) return;
    poserStatut({ ...t, bucket: "sur_le_feu", fin: null }, vers);
  };

  return (
    <DndContext id="dnd-daily" sensors={sensors} collisionDetection={collision}
      onDragStart={({ active }: DragStartEvent) => setAttrapee(toutes.find((x) => x.id === String(active.id)) ?? null)}
      onDragEnd={finDeGlisser} onDragCancel={() => setAttrapee(null)}>
      {STATUTS.map((statut) => {
        const cartes = toutes.filter((t) => t.statut === statut);
        const [point, filet] = COULEUR[statut];
        return (
          <Colonne key={statut} statut={statut} filet={filet} point={point} nombre={cartes.length}>
              {cartes.map((t) => (
                <CarteDuJour key={t.id} t={t} onOuvrir={setOuverteId} onTerminer={(id) => finir(terminer)(id)} />
              ))}
              <NouvelleTache compact ouvert={saisie === statut} onOuvrir={() => setSaisie(statut)}
                onFermer={() => setSaisie((s) => (s === statut ? null : s))} onCreer={(titre) => creer(statut, titre)} />
          </Colonne>
        );
      })}
      <DragOverlay>{attrapee ? <Vignette t={attrapee} /> : null}</DragOverlay>

      {erreur && <p role="alert" className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-bloque/40 bg-bloque-voile px-4 py-2.5 text-sm">{erreur}</p>}

      <Detail tache={ouverteId ? fiche(ouverteId) : null} membres={membres} onFermer={() => setOuverteId(null)}
        onModifier={modifier} onTerminer={finir(terminer)} onAbandonner={finir(abandonner)} onSupprimer={finir(supprimer)}
        onRouvrir={finir(rouvrir)} onStatut={poserStatut}
        onRaison={(t) => setDemandeBlocage({ id: t.id, titre: t.titre, raison: t.raisonBlocage, mode: "modifier" })}
        onReporter={(t) => setDemandeReport({ id: t.id, titre: t.titre, reportsCount: t.reportsCount })} />

      <Blocage demande={demandeBlocage} candidates={toutes.map((t) => ({ id: t.id, titre: t.titre }))} onConfirmer={bloquer} onAnnuler={() => setDemandeBlocage(null)} />
      <Report demande={demandeReport}
        onReporter={async (id, corps) => {
          // Reporté, c'est demain ou plus tard : la Tâche quitte le jour même.
          retirer(id); setDemandeReport(null); setOuverteId(null);
          await agir(() => reporter(id, corps));
        }}
        onAbandonner={async (id) => { setDemandeReport(null); await finir(abandonner)(id); }}
        onAnnuler={() => setDemandeReport(null)} />
    </DndContext>
  );
}

/** Une colonne du Daily : un titre, un compte, et une zone où déposer. */
function Colonne({ statut, filet, point, nombre, children }: { statut: Statut; filet: string; point: string; nombre: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: statut });
  return (
    <section className="flex min-h-0 flex-col overflow-y-auto py-4 pl-5 pr-4">
      <header className={`flex items-baseline justify-between border-b pb-1.5 ${filet}`}>
        <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-tight"><span className={`h-1.5 w-1.5 rounded-full ${point}`} />{LIBELLE[statut]}</h2>
        <span className="text-xs text-texte-sourd">{nombre}</span>
      </header>
      <div ref={setNodeRef} className={`flex min-h-24 flex-1 flex-col gap-2 rounded-b-lg pt-2 transition-colors ${isOver ? "bg-surface-2" : ""}`}>
        {children}
      </div>
    </section>
  );
}

/** Ce que montre une carte, dans la colonne comme sous le curseur. */
function Vignette({ t, fantome }: { t: TacheDuJour; fantome?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 pt-2.5 pb-2 ${TEINTE[t.statut]} ${fantome ? "shadow-2xl" : ""}`}>
      <span className="line-clamp-2 text-[13.5px] leading-snug">{t.titre}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={`h-[15px] w-[15px] flex-none rounded-full border-[1.5px] border-texte-tres-faible ${t.statut === "bloque" ? "border-dashed" : ""}`} />
        <Meta tache={t} />
        {t.assigne && <Initiale nom={t.assigne.nom} avatar={t.assigne.avatar} grande />}
      </div>
    </div>
  );
}

/**
 * Une carte qu'on peut attraper. Le clic reste un clic : dnd-kit n'appelle le glisser qu'au-delà
 * de six pixels — sans ça, ouvrir une fiche deviendrait impossible.
 */
function CarteDuJour({ t, onOuvrir, onTerminer }: { t: TacheDuJour; onOuvrir: (id: string) => void; onTerminer: (id: string) => void }) {
  const provisoire = t.id.startsWith("provisoire-");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, disabled: provisoire });
  return (
    <article ref={setNodeRef} {...attributes} {...listeners}
      className={`rounded-lg border px-3 pt-2.5 pb-2 select-none ${TEINTE[t.statut]} ${provisoire ? "opacity-60" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "opacity-30" : ""}`}>
      <button onClick={() => !provisoire && onOuvrir(t.id)} className="block w-full text-left">
        <span className="line-clamp-2 text-[13.5px] leading-snug">{t.titre}</span>
      </button>
      <div className="mt-1.5 flex items-center gap-2">
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => !provisoire && onTerminer(t.id)} disabled={provisoire} aria-label={`Terminer ${t.titre}`} title="Terminé"
          className={`h-[15px] w-[15px] flex-none rounded-full border-[1.5px] border-texte-tres-faible hover:border-accent hover:bg-accent-voile ${t.statut === "bloque" ? "border-dashed" : ""}`} />
        <Meta tache={t} />
        {t.assigne && <Initiale nom={t.assigne.nom} avatar={t.assigne.avatar} grande />}
      </div>
    </article>
  );
}

"use client";
import { DndContext, DragOverlay, PointerSensor, closestCorners, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { abandonner, appliquer, deplacerBucket, modifierRaison, reporter, supprimer, terminer } from "./api";
import { Blocage, type DemandeBlocage } from "./Blocage";
import { Detail } from "./Detail";
import { DroitEntree, type Demande, type Membre } from "./DroitEntree";
import { EnAttente, type TacheAttente } from "./EnAttente";
import { PourQuand, type DemandeAVenir } from "./PourQuand";
import { Report, type DemandeReport } from "./Report";
import { Carte, type TacheCarte } from "./Carte";
import { Colonne } from "./Colonne";
import { colonneDe, colonneVisee, deplacer, type Colonnes, type Mutation, type Statut } from "./deplacement";

const STATUTS: Statut[] = ["a_faire", "en_cours", "bloque"];

/**
 * Où lâche-t-on ? D'abord la zone qui contient le pointeur — c'est ce que l'œil attend.
 * `closestCorners` seul élit parfois une carte d'une colonne voisine plus haute, parce que
 * ses coins sont « plus proches » que ceux d'une colonne courte : on ne le garde qu'en repli.
 */
const collision: CollisionDetection = (args) => {
  const sous = pointerWithin(args);
  return sous.length > 0 ? sous : closestCorners(args);
};

export function Kanban({ taches, enAttente, membres, moiId }: { taches: TacheCarte[]; enAttente: TacheAttente[]; membres: Membre[]; moiId: string }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const parId = useMemo(() => new Map(taches.map((t) => [t.id, t])), [taches]);
  const initiales = useMemo<Colonnes>(() => ({
    a_faire: taches.filter((t) => t.statut === "a_faire").map((t) => t.id),
    en_cours: taches.filter((t) => t.statut === "en_cours").map((t) => t.id),
    bloque: taches.filter((t) => t.statut === "bloque").map((t) => t.id),
  }), [taches]);
  const [colonnes, setColonnes] = useState<Colonnes>(initiales);
  // Quand le serveur renvoie de nouvelles données, on repart d'elles : ajustement pendant
  // le rendu, le motif que React recommande à la place d'un effet.
  const [base, setBase] = useState(initiales);
  if (base !== initiales) { setBase(initiales); setColonnes(initiales); }
  const [actif, setActif] = useState<TacheCarte | null>(null);
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [demande, setDemande] = useState<Demande>(null);
  const [demandeAVenir, setDemandeAVenir] = useState<DemandeAVenir>(null);
  const [demandeReport, setDemandeReport] = useState<DemandeReport>(null);
  // Une carte lâchée dans Bloqué attend sa raison avant que rien ne parte au serveur.
  const [demandeBlocage, setDemandeBlocage] = useState<DemandeBlocage>(null);
  const [mutationsEnAttente, setMutationsEnAttente] = useState<Mutation[]>([]);
  const attenteParId = useMemo(() => new Map(enAttente.map((t) => [t.id, t])), [enAttente]);
  const [erreur, setErreur] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rafraichir = () => demarrer(() => router.refresh());

  async function finDeGlisser({ active, over }: DragEndEvent) {
    setActif(null);
    const venue = attenteParId.get(String(active.id));
    if (venue) {
      // Une carte du panneau lâchée sur le kanban : c'est le droit d'entrée qui décide.
      const statut = colonneVisee(colonnes, over ? String(over.id) : null);
      if (statut) setDemande({ id: venue.id, titre: venue.titre, statut });
      return;
    }
    if (!over || active.id === over.id) return;
    const { mutations, colonnes: suivantes } = deplacer(colonnes, String(active.id), String(over.id));
    if (mutations.length === 0) return;
    setColonnes(suivantes);
    if (mutations.some((m) => m.type === "statut" && m.statut === "bloque")) {
      const t = parId.get(String(active.id));
      setMutationsEnAttente(mutations);
      setDemandeBlocage({ id: String(active.id), titre: t?.titre ?? "", raison: null, mode: "bloquer" });
      return;
    }
    await envoyer(mutations);
  }
  async function envoyer(mutations: Mutation[]) {
    try {
      for (const m of mutations) await appliquer(m);
    } catch (e) {
      setErreur((e as Error).message);
      setColonnes(initiales);
    }
    rafraichir();
  }
  async function bloquer(id: string, raison: string) {
    if (demandeBlocage?.mode === "modifier") {
      setErreur(null);
      try { await modifierRaison(id, raison); } catch (e) { setErreur((e as Error).message); }
      setDemandeBlocage(null); rafraichir(); return;
    }
    const mutations = mutationsEnAttente.map((m) => (m.type === "statut" ? { ...m, raison } : m));
    setDemandeBlocage(null); setMutationsEnAttente([]);
    await envoyer(mutations);
  }
  function annulerBlocage() {
    if (demandeBlocage?.mode === "bloquer") setColonnes(initiales);
    setDemandeBlocage(null); setMutationsEnAttente([]);
  }

  const action = (fn: (id: string) => Promise<void>) => async (id: string) => {
    setErreur(null);
    try { await fn(id); } catch (e) { setErreur((e as Error).message); }
    rafraichir();
  };
  const onTerminer = action(terminer);

  const carte = (id: string, statut: Statut): TacheCarte => ({ ...parId.get(id)!, statut });

  async function destination(t: TacheAttente, b: "sur_le_feu" | "a_venir" | "idees") {
    if (b === "sur_le_feu") { setDemande({ id: t.id, titre: t.titre, statut: "a_faire" }); return; }
    if (b === "a_venir") { setDemandeAVenir({ id: t.id, titre: t.titre }); return; }
    setErreur(null);
    try { await deplacerBucket(t.id, { bucket: "idees" }); } catch (e) { setErreur((e as Error).message); }
    rafraichir();
  }
  async function reporterTache(id: string, corps: { raison: string; nouvelEngagement: string }) {
    setErreur(null);
    try { await reporter(id, corps); setDemandeReport(null); setOuverteId(null); }
    catch (e) { setErreur((e as Error).message); }
    rafraichir();
  }
  async function passerAVenir(id: string, engagement: string | null) {
    setErreur(null);
    try { await deplacerBucket(id, { bucket: "a_venir", engagement }); setDemandeAVenir(null); }
    catch (e) { setErreur((e as Error).message); }
    rafraichir();
  }
  async function entrerSurLeFeu(d: { id: string; assigneId: string; engagement: string; statut: Statut; raison?: string }) {
    setErreur(null);
    try { await deplacerBucket(d.id, { bucket: "sur_le_feu", assigneId: d.assigneId, engagement: d.engagement, statut: d.statut, raison: d.raison }); setDemande(null); }
    catch (e) { setErreur((e as Error).message); }
    rafraichir();
  }

  return (
    <DndContext
      // Un id stable : sans lui, dnd-kit numérote ses attributs d'accessibilité différemment
      // côté serveur et côté client, et React signale un décalage d'hydratation.
      id="dnd-board"
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }: DragStartEvent) => {
        const id = String(active.id); const a = attenteParId.get(id);
        setActif(parId.get(id) ?? (a ? { id: a.id, titre: a.titre, statut: "a_faire", engagement: a.engagement, reportsCount: 0, assigne: a.assigne, aidants: [], notes: null, transcriptionBrute: a.transcriptionBrute, raisonBlocage: null } : null));
      }}
      onDragEnd={finDeGlisser}
      onDragCancel={() => setActif(null)}
    >
      {erreur && (
        <p role="alert" className="mx-8 mt-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">
          {erreur} <button className="ml-2 underline" onClick={() => setErreur(null)}>ok</button>
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 px-5 pb-5 pt-4">
          {STATUTS.map((s) => (
            <Colonne key={s} statut={s} taches={colonnes[s].filter((id) => parId.has(id)).map((id) => carte(id, s))} onTerminer={onTerminer} onOuvrir={setOuverteId} />
          ))}
        </div>
        <EnAttente taches={enAttente} onDestination={destination} onSupprimer={action(supprimer)} onOuvrir={() => {}} />
      </div>
      <DroitEntree demande={demande} membres={membres} moiId={moiId} onConfirmer={entrerSurLeFeu} onAnnuler={() => setDemande(null)} />
      <PourQuand demande={demandeAVenir} onConfirmer={passerAVenir} onAnnuler={() => setDemandeAVenir(null)} />
      <DragOverlay>{actif ? <Carte tache={actif} fantome /> : null}</DragOverlay>
      <Detail
        tache={ouverteId ? (() => { const t = parId.get(ouverteId); return t ? carte(ouverteId, colonneDe(colonnes, ouverteId) ?? t.statut) : null; })() : null}
        onFermer={() => setOuverteId(null)}
        onTerminer={action(terminer)}
        onAbandonner={action(abandonner)}
        onSupprimer={action(supprimer)}
        onReporter={(t) => setDemandeReport({ id: t.id, titre: t.titre, reportsCount: t.reportsCount })}
        onRaison={(t) => setDemandeBlocage({ id: t.id, titre: t.titre, raison: t.raisonBlocage, mode: "modifier" })}
      />
      <Blocage demande={demandeBlocage} onConfirmer={bloquer} onAnnuler={annulerBlocage} />
      <Report demande={demandeReport} onReporter={reporterTache}
        onAbandonner={async (id) => { await action(abandonner)(id); setDemandeReport(null); setOuverteId(null); }}
        onAnnuler={() => setDemandeReport(null)} />
    </DndContext>
  );
}

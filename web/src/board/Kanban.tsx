"use client";
import { DndContext, DragOverlay, PointerSensor, closestCorners, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { abandonner, appliquer, creerTache, deplacerBucket, modifierTache, reporter, rouvrir, supprimer, terminer, type Patch } from "./api";
import { Blocage, type DemandeBlocage } from "./Blocage";
import { Detail, type TacheFiche } from "./Detail";
import { DroitEntree, type Demande, type Membre } from "./DroitEntree";
import { EnAttente, type TacheAttente, type TacheFinie } from "./EnAttente";
import { PourQuand, type DemandeAVenir } from "./PourQuand";
import { Report, type DemandeReport } from "./Report";
import { Carte, type TacheCarte } from "./Carte";
import { Colonne } from "./Colonne";
import { colonneDe, colonneVisee, deposer, mutationsDe, survoler, type Colonnes, type Mutation, type Statut } from "./deplacement";

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

export function Kanban({ taches, enAttente, finies, membres, moiId }: { taches: TacheCarte[]; enAttente: TacheAttente[]; finies: TacheFinie[]; membres: Membre[]; moiId: string }) {
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
  // Les colonnes au départ du glisser : c'est contre elles qu'on calcule ce qui a changé, et vers elles qu'on revient si ça tourne mal.
  const [origine, setOrigine] = useState<Colonnes>(initiales);
  const [ouverteId, setOuverteId] = useState<string | null>(null);
  const [demande, setDemande] = useState<Demande>(null);
  const [demandeAVenir, setDemandeAVenir] = useState<DemandeAVenir>(null);
  const [demandeReport, setDemandeReport] = useState<DemandeReport>(null);
  // Une carte lâchée dans Bloqué attend sa raison avant que rien ne parte au serveur.
  const [demandeBlocage, setDemandeBlocage] = useState<DemandeBlocage>(null);
  const [mutationsEnAttente, setMutationsEnAttente] = useState<Mutation[]>([]);
  // Les Tâches tapées à l'instant, posées à l'écran avant la réponse du serveur. Le prochain
  // rendu venu du serveur les remplace par les vraies — même motif que les colonnes.
  const [provisoires, setProvisoires] = useState<TacheAttente[]>([]);
  // Tant qu'une création est en route, on garde les provisoires : sinon la deuxième ligne tapée
  // disparaîtrait le temps que la première revienne du serveur.
  const enVol = useRef(0);
  const [baseAttente, setBaseAttente] = useState(enAttente);
  if (baseAttente !== enAttente) { setBaseAttente(enAttente); if (enVol.current === 0) setProvisoires([]); }
  const attendues = useMemo(() => [...enAttente, ...provisoires], [enAttente, provisoires]);
  const attenteParId = useMemo(() => new Map(enAttente.map((t) => [t.id, t])), [enAttente]);
  const finiesParId = useMemo(() => new Map(finies.map((t) => [t.id, t])), [finies]);
  const [erreur, setErreur] = useState<string | null>(null);
  // Le dernier Terminé / Abandonné, le temps de se raviser : un « Annuler » de six secondes.
  const [derniereFin, setDerniereFin] = useState<{ id: string; titre: string; libelle: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const rafraichir = () => demarrer(() => router.refresh());

  /** Pendant le glisser : la carte entre dans la colonne survolée, on voit où elle va atterrir. */
  function survol({ active, over }: DragOverEvent) {
    if (!over || attenteParId.has(String(active.id))) return;
    const suivantes = survoler(colonnes, String(active.id), String(over.id));
    if (suivantes !== colonnes) setColonnes(suivantes);
  }

  async function finDeGlisser({ active, over }: DragEndEvent) {
    setActif(null);
    const venue = attenteParId.get(String(active.id));
    if (venue) {
      // Une carte du panneau lâchée sur le kanban : c'est le droit d'entrée qui décide.
      const statut = colonneVisee(colonnes, over ? String(over.id) : null);
      if (statut) setDemande({ id: venue.id, titre: venue.titre, statut });
      return;
    }
    if (!over) { setColonnes(origine); return; }
    const finales = deposer(colonnes, String(active.id), String(over.id));
    const mutations = mutationsDe(origine, finales, String(active.id));
    if (mutations.length === 0) { setColonnes(origine); return; }
    setColonnes(finales);
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
      setColonnes(origine);
    }
    rafraichir();
  }
  async function bloquer(id: string, raison: string) {
    if (demandeBlocage?.mode === "modifier") {
      setErreur(null);
      try { await modifierTache(id, { raisonBlocage: raison }); } catch (e) { setErreur((e as Error).message); }
      setDemandeBlocage(null); rafraichir(); return;
    }
    const mutations = mutationsEnAttente.map((m) => (m.type === "statut" ? { ...m, raison } : m));
    setDemandeBlocage(null); setMutationsEnAttente([]);
    await envoyer(mutations);
  }
  function annulerBlocage() {
    if (demandeBlocage?.mode === "bloquer") setColonnes(origine);
    setDemandeBlocage(null); setMutationsEnAttente([]);
  }

  const action = (fn: (id: string) => Promise<void>) => async (id: string) => {
    setErreur(null);
    try { await fn(id); } catch (e) { setErreur((e as Error).message); }
    rafraichir();
  };
  const finir = (fn: (id: string) => Promise<void>, libelle: string) => async (id: string) => {
    const titre = parId.get(id)?.titre ?? "";
    setErreur(null);
    try { await fn(id); setDerniereFin({ id, titre, libelle }); setTimeout(() => setDerniereFin((d) => (d?.id === id ? null : d)), 6000); }
    catch (e) { setErreur((e as Error).message); }
    rafraichir();
  };
  const onTerminer = finir(terminer, "terminée");
  const onAbandonner = finir(abandonner, "abandonnée");
  async function modifier(id: string, patch: Patch) {
    setErreur(null);
    try { await modifierTache(id, patch); } catch (e) { setErreur((e as Error).message); }
    rafraichir();
  }

  const carte = (id: string, statut: Statut): TacheCarte => ({ ...parId.get(id)!, statut });
  /** La Tâche ouverte, d'où qu'elle vienne : une colonne Sur le feu, ou une pile du panneau. */
  function fiche(id: string): TacheFiche | null {
    const t = parId.get(id);
    if (t) return { ...t, statut: colonneDe(colonnes, id) ?? t.statut, bucket: "sur_le_feu" };
    return attenteParId.get(id) ?? finiesParId.get(id) ?? null;
  }

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
  async function entrerSurLeFeu(d: { id: string; titre: string; assigneId: string; engagement: string; statut: Statut; raison?: string }) {
    setErreur(null);
    try {
      // Une Tâche tapée dans la fenêtre n'existe pas encore : on la crée, puis elle entre — par le même droit d'entrée que les autres.
      const id = d.id || (await creerTache(d.titre)).id;
      await deplacerBucket(id, { bucket: "sur_le_feu", assigneId: d.assigneId, engagement: d.engagement, statut: d.statut, raison: d.raison }); setDemande(null);
    }
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
        setOrigine(colonnes);
        setActif(parId.get(id) ?? (a ? { id: a.id, titre: a.titre, statut: "a_faire", engagement: a.engagement, reportsCount: 0, assigne: a.assigne, aidants: [], aidantIds: [], assigneId: null, notes: null, transcriptionBrute: a.transcriptionBrute, raisonBlocage: null } : null));
      }}
      onDragOver={survol}
      onDragEnd={finDeGlisser}
      onDragCancel={() => { setActif(null); setColonnes(origine); }}
    >
      {erreur && (
        <p role="alert" className="mx-8 mt-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">
          {erreur} <button className="ml-2 underline" onClick={() => setErreur(null)}>ok</button>
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-4 px-5 pb-5 pt-4">
          {STATUTS.map((s) => (
            <Colonne key={s} statut={s} taches={colonnes[s].filter((id) => parId.has(id)).map((id) => carte(id, s))} membres={membres} onTerminer={onTerminer} onOuvrir={setOuverteId} onAssigner={(id, assigneId) => modifier(id, { assigneId })}
              onNouvelle={() => setDemande({ id: "", titre: "", statut: s })} />
          ))}
        </div>
        <EnAttente taches={attendues} finies={finies} onRouvrir={action(rouvrir)} onDestination={destination} onSupprimer={action(supprimer)} onOuvrir={setOuverteId} onCreer={(bucket, titre) => {
          setErreur(null);
          setProvisoires((p) => [...p, { id: `provisoire-${crypto.randomUUID()}`, titre, bucket, provisoire: true, statut: null, engagement: null, reportsCount: 0, assigneId: null, assigne: null, aidantIds: [], aidants: [], notes: null, transcriptionBrute: null, raisonBlocage: null, auteur: null }]);
          enVol.current += 1;
          creerTache(titre, bucket)
            .catch((e) => { setErreur((e as Error).message); setProvisoires([]); })
            .finally(() => { enVol.current -= 1; rafraichir(); });
        }} />
      </div>
      <DroitEntree demande={demande} membres={membres} moiId={moiId} onConfirmer={entrerSurLeFeu} onAnnuler={() => setDemande(null)} />
      <PourQuand demande={demandeAVenir} onConfirmer={passerAVenir} onAnnuler={() => setDemandeAVenir(null)} />
      <DragOverlay>{actif ? <Carte tache={actif} fantome /> : null}</DragOverlay>
      <Detail
        tache={ouverteId ? fiche(ouverteId) : null}
        membres={membres}
        onModifier={modifier}
        onFermer={() => setOuverteId(null)}
        onTerminer={onTerminer}
        onAbandonner={onAbandonner}
        onSupprimer={action(supprimer)}
        onReporter={(t) => setDemandeReport({ id: t.id, titre: t.titre, reportsCount: t.reportsCount })}
        // Le Statut et la raison du blocage n'existent que Sur le feu : ailleurs, la fiche ne les montre pas.
        onRouvrir={action(rouvrir)}
        onRaison={(t) => setDemandeBlocage({ id: t.id, titre: t.titre, raison: t.raisonBlocage, mode: "modifier" })}
        onStatut={(t, statut) => {
          if (statut === t.statut) return;
          // Vers Bloqué, la raison d'abord ; sinon, tout de suite.
          if (statut === "bloque") { setMutationsEnAttente([{ type: "statut", id: t.id, statut: "bloque" }]); setDemandeBlocage({ id: t.id, titre: t.titre, raison: null, mode: "bloquer" }); }
          else action((id) => appliquer({ type: "statut", id, statut }))(t.id);
        }}
      />
      <Blocage demande={demandeBlocage} onConfirmer={bloquer} onAnnuler={annulerBlocage} />
      {derniereFin && (
        <div role="status" className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-bord-fort bg-surface px-4 py-2.5 text-sm shadow-2xl">
          <span>« {derniereFin.titre} » {derniereFin.libelle}</span>
          <button onClick={() => { const id = derniereFin.id; setDerniereFin(null); action(rouvrir)(id); }} className="font-medium text-accent">Annuler</button>
        </div>
      )}
      <Report demande={demandeReport} onReporter={reporterTache}
        onAbandonner={async (id) => { await onAbandonner(id); setDemandeReport(null); setOuverteId(null); }}
        onAnnuler={() => setDemandeReport(null)} />
    </DndContext>
  );
}

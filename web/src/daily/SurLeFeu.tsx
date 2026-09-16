"use client";
import { useRouter } from "next/navigation";
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
  const bloquer = async (id: string, raison: string) => {
    const modifie = demandeBlocage?.mode === "modifier";
    toucher(id, { statut: "bloque", raisonBlocage: raison });
    setDemandeBlocage(null);
    await agir(() => (modifie ? modifierTache(id, { raisonBlocage: raison }) : appliquer({ type: "statut", id, statut: "bloque", raison })));
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

  return (
    <>
      {STATUTS.map((statut) => {
        const cartes = toutes.filter((t) => t.statut === statut);
        const [point, filet] = COULEUR[statut];
        return (
          <section key={statut} className="flex min-h-0 flex-col overflow-y-auto py-4 pl-5 pr-4">
            <header className={`flex items-baseline justify-between border-b pb-1.5 ${filet}`}>
              <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-tight"><span className={`h-1.5 w-1.5 rounded-full ${point}`} />{LIBELLE[statut]}</h2>
              <span className="text-xs text-texte-sourd">{cartes.length}</span>
            </header>
            <div className="flex flex-col gap-2 pt-2">
              {cartes.map((t) => {
                const provisoire = t.id.startsWith("provisoire-");
                return (
                  <article key={t.id} className={`rounded-lg border px-3 pt-2.5 pb-2 ${TEINTE[t.statut]} ${provisoire ? "opacity-60" : ""}`}>
                    <button onClick={() => !provisoire && setOuverteId(t.id)} className="block w-full text-left">
                      <span className="line-clamp-2 text-[13.5px] leading-snug">{t.titre}</span>
                    </button>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button onClick={() => !provisoire && finir(terminer)(t.id)} disabled={provisoire} aria-label={`Terminer ${t.titre}`} title="Terminé"
                        className={`h-[15px] w-[15px] flex-none rounded-full border-[1.5px] border-texte-tres-faible hover:border-accent hover:bg-accent-voile ${t.statut === "bloque" ? "border-dashed" : ""}`} />
                      <Meta tache={t} />
                      {t.assigne && <Initiale nom={t.assigne.nom} avatar={t.assigne.avatar} grande />}
                    </div>
                  </article>
                );
              })}
              <NouvelleTache compact ouvert={saisie === statut} onOuvrir={() => setSaisie(statut)}
                onFermer={() => setSaisie((s) => (s === statut ? null : s))} onCreer={(titre) => creer(statut, titre)} />
            </div>
          </section>
        );
      })}

      {erreur && <p role="alert" className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-bloque/40 bg-bloque-voile px-4 py-2.5 text-sm">{erreur}</p>}

      <Detail tache={ouverteId ? fiche(ouverteId) : null} membres={membres} onFermer={() => setOuverteId(null)}
        onModifier={modifier} onTerminer={finir(terminer)} onAbandonner={finir(abandonner)} onSupprimer={finir(supprimer)}
        onRouvrir={finir(rouvrir)} onStatut={poserStatut}
        onRaison={(t) => setDemandeBlocage({ id: t.id, titre: t.titre, raison: t.raisonBlocage, mode: "modifier" })}
        onReporter={(t) => setDemandeReport({ id: t.id, titre: t.titre, reportsCount: t.reportsCount })} />

      <Blocage demande={demandeBlocage} onConfirmer={bloquer} onAnnuler={() => setDemandeBlocage(null)} />
      <Report demande={demandeReport}
        onReporter={async (id, corps) => {
          // Reporté, c'est demain ou plus tard : la Tâche quitte le jour même.
          retirer(id); setDemandeReport(null); setOuverteId(null);
          await agir(() => reporter(id, corps));
        }}
        onAbandonner={async (id) => { setDemandeReport(null); await finir(abandonner)(id); }}
        onAnnuler={() => setDemandeReport(null)} />
    </>
  );
}

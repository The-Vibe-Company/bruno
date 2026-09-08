"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { libelleJour } from "@/lib/dates";
import { Initiale, Reporte, type TacheCarte } from "./Carte";
import type { Statut } from "./deplacement";

const STATUT: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", bloque: "Bloqué" };

/**
 * Le détail d'une Tâche, en panneau latéral, sans quitter le Board — on trie en rafale.
 * Les trois fins vivent ici : Terminé en primaire, Abandonner à côté, Supprimer à l'écart
 * et derrière une confirmation, parce qu'il efface pour de bon.
 */
export function Detail({ tache, onFermer, onTerminer, onAbandonner, onSupprimer, onReporter }: {
  tache: TacheCarte | null; onFermer: () => void;
  onTerminer: (id: string) => Promise<void>; onAbandonner: (id: string) => Promise<void>; onSupprimer: (id: string) => Promise<void>;
  onReporter: (t: TacheCarte) => void;
}) {
  const [occupe, setOccupe] = useState(false);
  type Report = { id: string; raison: string; ancienEngagement: string; nouvelEngagement: string; createdAt: string; auteur: string | null };
  // L'historique des Reports, chargé à l'ouverture : visible de tous, avec qui et pourquoi.
  // Rangé avec l'id de sa Tâche : on n'affiche jamais l'historique d'une autre.
  const [charge, setCharge] = useState<{ pour: string; liste: Report[] } | null>(null);
  useEffect(() => {
    if (!tache || tache.reportsCount === 0) return;
    let vivant = true;
    const pour = tache.id;
    fetch(`/api/taches/${pour}/reports`).then((r) => r.json()).then((liste: Report[]) => { if (vivant) setCharge({ pour, liste }); }).catch(() => {});
    return () => { vivant = false; };
  }, [tache]);
  const historique = tache && charge?.pour === tache.id ? charge.liste : null;
  const agir = (fn: (id: string) => Promise<void>) => async () => {
    if (!tache) return;
    setOccupe(true);
    try { await fn(tache.id); onFermer(); } finally { setOccupe(false); }
  };

  return (
    <Dialog.Root open={tache !== null} onOpenChange={(o) => !o && onFermer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-fond-page/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 flex w-[440px] max-w-full flex-col border-l border-bord-2 bg-fond shadow-2xl outline-none"
        >
          {tache && (
            <>
              <header className="flex items-center justify-between px-6 pt-5 pb-3">
                <span className="text-[13px] text-texte-sourd">Sur le feu · {STATUT[tache.statut]}</span>
                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <button className="text-[13px] text-texte-sourd hover:text-bloque" disabled={occupe}>Supprimer</button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-fond-page/60" />
                    <AlertDialog.Content className="fixed left-1/2 top-1/2 w-[380px] max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-bord bg-surface p-5 shadow-2xl outline-none">
                      <AlertDialog.Title className="text-lg font-semibold tracking-tight">Supprimer cette Tâche ?</AlertDialog.Title>
                      <AlertDialog.Description className="mt-2 text-[14.5px] text-texte-sourd">
                        Elle disparaît pour de bon, sans trace. Si vous avez décidé de ne pas la faire, préférez « Abandonner » : ça reste consultable.
                      </AlertDialog.Description>
                      <div className="mt-5 flex justify-end gap-2">
                        <AlertDialog.Cancel asChild><button className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Annuler</button></AlertDialog.Cancel>
                        <AlertDialog.Action asChild><button onClick={agir(onSupprimer)} className="h-10 rounded-lg bg-bloque px-4 text-[14.5px] font-medium text-sur-accent">Supprimer</button></AlertDialog.Action>
                      </div>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>
              </header>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-4">
                <div>
                  <Dialog.Title className="text-2xl font-semibold leading-tight tracking-tight">{tache.titre}</Dialog.Title>
                  <p className="mt-1.5 text-sm text-texte-sourd">
                    {STATUT[tache.statut]}
                    {tache.reportsCount > 0 && <> · <Reporte n={tache.reportsCount} /></>}
                  </p>
                </div>

                <dl className="overflow-hidden rounded-xl border border-bord bg-surface text-[15px]">
                  {[
                    ["Assigné", tache.assigne ? <span className="flex items-center gap-2"><Initiale nom={tache.assigne.nom} />{tache.assigne.nom}</span> : <span className="text-texte-faible">personne</span>],
                    ["Aidants", tache.aidants.length ? <span className="flex items-center gap-2">{tache.aidants.map((a) => <span key={a.nom} className="flex items-center gap-1.5"><Initiale nom={a.nom} />{a.nom}</span>)}</span> : <span className="text-texte-faible">—</span>],
                    ["Engagement", tache.engagement ? libelleJour(tache.engagement) : "—"],
                    ["Statut", STATUT[tache.statut]],
                    ["Reports", String(tache.reportsCount)],
                  ].map(([k, v], i, arr) => (
                    <div key={String(k)} className={`flex min-h-[50px] items-center gap-3 px-3.5 ${i < arr.length - 1 ? "border-b border-bord-2" : ""}`}>
                      <dt className="w-24 text-sm text-texte-sourd">{k}</dt>
                      <dd className="flex-1">{v}</dd>
                    </div>
                  ))}
                </dl>

                {historique && historique.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm text-texte-sourd">Reports</h3>
                    <ol className="flex flex-col gap-1.5 rounded-xl border border-bord bg-surface px-3.5 py-3 text-[14px]">
                      {historique.map((h) => (
                        <li key={h.id} className="flex items-baseline gap-2">
                          <span className="flex-1">« {h.raison} »</span>
                          <span className="whitespace-nowrap text-[12.5px] text-texte-sourd">{libelleJour(h.ancienEngagement)} → {libelleJour(h.nouvelEngagement)}{h.auteur ? ` · ${h.auteur}` : ""}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm text-texte-sourd">Notes</h3>
                  <div className="rounded-xl border border-bord bg-surface px-3.5 py-3 text-[15px] leading-relaxed">
                    {tache.notes ? <p>{tache.notes}</p> : <p className="text-texte-faible">Aucune note.</p>}
                    {tache.transcriptionBrute && (
                      <>
                        <hr className="my-3 border-bord-2" />
                        <p className="text-sm italic text-texte-sourd">« {tache.transcriptionBrute} »</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <footer className="flex flex-col gap-2 border-t border-bord-faible px-6 pt-4 pb-6">
                <button onClick={agir(onTerminer)} disabled={occupe} className="h-[46px] rounded-lg bg-accent text-[14.5px] font-medium text-sur-accent disabled:opacity-60">Terminé</button>
                <div className="flex gap-2">
                  <button onClick={() => onReporter(tache)} disabled={occupe || !tache.engagement} title={tache.engagement ? undefined : "Rien à reporter : cette Tâche n’a pas d’Engagement"} className="h-[42px] flex-1 rounded-lg border border-bord-fort text-[14.5px] disabled:opacity-50">Reporter</button>
                  <button onClick={agir(onAbandonner)} disabled={occupe} className="h-[42px] flex-1 rounded-lg border border-bord-fort text-[14.5px] disabled:opacity-60">Abandonner</button>
                </div>
              </footer>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { lire, lister } from "@/api/agendas";
import type { Agenda, Evenement } from "@/api/contrat";
import { microsoftConfigure } from "@/agenda/fournisseurs";
import { ajouterJours, heureDe, minutesDansLeJour } from "@/agenda/periode";
import { sessionCourante } from "@/auth/serveur";
import { Initiale } from "@/board/visuel";
import { Agendas } from "@/calendrier/Agendas";
import { couvre, disposer, touche } from "@/calendrier/disposition";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { allegerAvatars } from "@/lib/avatar-url";
import { lundiDe } from "@/lib/dates";
import { PALETTE } from "@/reglages/palette";
import { instant } from "@/relances/temps";

export const dynamic = "force-dynamic";

type Vue = "semaine" | "jour";
type Personne = { id: string; nom: string; avatar: string | null };

/**
 * Le Calendrier : les agendas de chacun, côte à côte. Bruno n'y écrit rien — il lit le Google, les
 * Outlook, les liens iCal que chacun a branchés, et les montre à tout le monde. La semaine met une
 * ligne par personne ; le jour, une colonne par personne, heure par heure.
 */
export default async function Calendrier({ searchParams }: { searchParams: Promise<{ jour?: string; vue?: string; branche?: string; erreur?: string }> }) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const p = await searchParams;
  const aujourdhui = instant().jour;
  const vue: Vue = p.vue === "jour" ? "jour" : "semaine";
  const jour = p.jour && /^\d{4}-\d{2}-\d{2}$/.test(p.jour) ? p.jour : aujourdhui;
  const du = vue === "semaine" ? lundiDe(jour) : jour;
  const au = vue === "semaine" ? ajouterJours(du, 6) : jour;

  const [membres, agendas, lecture] = await Promise.all([
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
      .where(and(eq(membre.spaceId, session.spaceId), eq(membre.actif, true), eq(membre.type, "humain")))
      .orderBy(asc(membre.createdAt)).then((l) => allegerAvatars(l, (m) => m.id)),
    lister(session),
    lire(session, du, au),
  ]);
  // Soi en premier : c'est son agenda qu'on branche, et celui qu'on cherche des yeux.
  const personnes: Personne[] = [...membres.filter((m) => m.id === session.membreId), ...membres.filter((m) => m.id !== session.membreId)];
  const couleurs = new Map(agendas.map((a, i) => [a.id, PALETTE[i % PALETTE.length]]));
  const erreurs = new Map(lecture.erreurs.map((e) => [e.agendaId, e.message]));

  const lien = (j: string, v: Vue = vue) => `/calendrier?${new URLSearchParams({ ...(j !== aujourdhui ? { jour: j } : {}), ...(v !== "semaine" ? { vue: v } : {}) })}`;
  const pas = vue === "semaine" ? 7 : 1;

  return (
    <>
      <header className="flex h-12 flex-none items-center gap-3 border-b border-bord-2 px-5">
        <h1 className="text-[17px] font-medium tracking-tight">Calendrier</h1>
        <span className="flex h-8 items-center gap-0.5 rounded-lg border border-bord-2 bg-surface pl-0.5 pr-2.5">
          <Fleche vers={lien(ajouterJours(jour, -pas))} libelle={vue === "semaine" ? "Semaine précédente" : "Jour précédent"} sens="gauche" />
          <span className="px-1 text-[13.5px] font-medium tracking-tight">{vue === "semaine" ? libelleSemaine(du, au) : libelleJourLong(jour)}</span>
          <Fleche vers={lien(ajouterJours(jour, pas))} libelle={vue === "semaine" ? "Semaine suivante" : "Jour suivant"} sens="droite" />
        </span>
        {!(du <= aujourdhui && aujourdhui <= au) && (
          <Link href={lien(aujourdhui)} className="flex h-8 items-center rounded-lg border border-bord-2 px-2.5 text-[13px] text-texte-sourd hover:text-texte">Aujourd’hui</Link>
        )}
        <div className="flex-1" />
        <span className="flex h-8 items-center rounded-lg border border-bord-2 bg-surface p-0.5 text-[13px]">
          {(["semaine", "jour"] as const).map((v) => (
            <Link key={v} href={lien(v === "jour" && vue === "semaine" && du <= aujourdhui && aujourdhui <= au ? aujourdhui : jour, v)} aria-current={v === vue ? "page" : undefined}
              className={`flex h-full items-center rounded-md px-2.5 ${v === vue ? "bg-surface-2 font-medium text-texte" : "text-texte-sourd hover:text-texte"}`}>
              {v === "semaine" ? "Semaine" : "Jour"}
            </Link>
          ))}
        </span>
        <Agendas personnes={personnes} agendas={agendas} moiId={session.membreId} couleurs={Object.fromEntries(couleurs)}
          erreurs={Object.fromEntries(erreurs)} outlookPret={microsoftConfigure()} />
      </header>

      {(p.branche || p.erreur) && (
        <p role={p.erreur ? "alert" : "status"} className={`mx-5 mt-3 rounded-lg border px-3 py-2 text-[13.5px] ${p.erreur ? "border-bloque/40 bg-bloque-voile" : "border-en-cours/40 bg-en-cours-voile"}`}>
          {p.erreur ?? `Agenda branché : ${p.branche}.`}
        </p>
      )}

      <main className="min-h-0 flex-1 overflow-auto">
        {agendas.length === 0 ? (
          <Vide />
        ) : vue === "semaine" ? (
          <Semaine du={du} aujourdhui={aujourdhui} personnes={personnes} agendas={agendas} evenements={lecture.evenements} couleurs={couleurs} erreurs={erreurs} lienJour={(j) => lien(j, "jour")} />
        ) : (
          <Jour jour={jour} aujourdhui={aujourdhui} personnes={personnes} agendas={agendas} evenements={lecture.evenements} couleurs={couleurs} erreurs={erreurs} />
        )}
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ la semaine */

function Semaine({ du, aujourdhui, personnes, agendas, evenements, couleurs, erreurs, lienJour }: {
  du: string; aujourdhui: string; personnes: Personne[]; agendas: Agenda[]; evenements: Evenement[];
  couleurs: Map<string, string>; erreurs: Map<string, string>; lienJour: (j: string) => string;
}) {
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(du, i));
  // Le week-end reste visible, plus étroit : on y a rarement des réunions, parfois un train.
  const colonnes = "grid-cols-[minmax(150px,190px)_repeat(5,minmax(120px,1fr))_repeat(2,minmax(80px,0.55fr))]";
  return (
    <div className={`grid min-w-[1000px] ${colonnes}`}>
      <div className="sticky top-0 z-10 border-b border-bord-2 bg-fond" />
      {jours.map((j) => (
        <Link key={j} href={lienJour(j)} title="Voir la journée"
          className={`sticky top-0 z-10 border-b border-l border-bord-2 bg-fond px-2.5 py-2 text-[12.5px] hover:text-texte ${j === aujourdhui ? "font-semibold text-accent" : "text-texte-sourd"}`}>
          {nomJour(j)}
        </Link>
      ))}
      {personnes.map((m) => {
        const siens = agendas.filter((a) => a.membreId === m.id);
        const evs = evenements.filter((e) => e.membreId === m.id);
        return (
          <Ligne key={m.id}>
            <div className="border-b border-bord-2 px-3 py-3">
              <Qui personne={m} agendas={siens} couleurs={couleurs} erreurs={erreurs} />
            </div>
            {jours.map((j) => {
              const journee = evs.filter((e) => couvre(e, j));
              const heures = evs.filter((e) => touche(e, j));
              return (
                <div key={j} className={`flex min-h-[92px] flex-col gap-1 border-b border-l border-bord-2 p-1.5 ${j === aujourdhui ? "bg-accent-voile/40" : ""}`}>
                  {journee.map((e) => <Pastille key={e.id} e={e} couleur={couleurs.get(e.agendaId)} />)}
                  {heures.map((e) => <Rendezvous key={e.id} e={e} couleur={couleurs.get(e.agendaId)} />)}
                  {siens.length === 0 && j === du && <span className="px-1 pt-1 text-[12px] text-texte-faible">Aucun agenda branché</span>}
                </div>
              );
            })}
          </Ligne>
        );
      })}
    </div>
  );
}

/** Une ligne de la grille : ses cellules se rangent dans la grille du parent. */
const Ligne = ({ children }: { children: React.ReactNode }) => <div className="contents">{children}</div>;

function Rendezvous({ e, couleur }: { e: Evenement; couleur?: string }) {
  const contenu = (
    <>
      <span className="font-medium tabular-nums text-texte-sourd">{heureDe(new Date(e.debut))}</span>{" "}
      <span className="text-texte">{e.titre}</span>
    </>
  );
  const forme = "block line-clamp-2 break-words rounded-md border-l-[3px] bg-surface px-1.5 py-1 text-[12px] leading-tight shadow-[0_0_0_1px_var(--bord-2)]";
  const titre = `${heureDe(new Date(e.debut))}–${heureDe(new Date(e.fin))} · ${e.titre}${e.lieu ? ` · ${e.lieu}` : ""}`;
  return e.lien
    ? <a href={e.lien} target="_blank" rel="noreferrer" title={titre} className={`${forme} hover:bg-surface-2`} style={{ borderLeftColor: couleur }}>{contenu}</a>
    : <span title={titre} className={forme} style={{ borderLeftColor: couleur }}>{contenu}</span>;
}

function Pastille({ e, couleur }: { e: Evenement; couleur?: string }) {
  return (
    <span title={`Toute la journée · ${e.titre}`} className="block truncate rounded-md px-1.5 py-0.5 text-[12px] font-medium text-texte"
      style={{ background: `color-mix(in srgb, ${couleur ?? "var(--accent)"} 22%, transparent)` }}>
      {e.titre}
    </span>
  );
}

/* ------------------------------------------------------------------ le jour */

const HAUTEUR_HEURE = 52;

function Jour({ jour, aujourdhui, personnes, agendas, evenements, couleurs, erreurs }: {
  jour: string; aujourdhui: string; personnes: Personne[]; agendas: Agenda[]; evenements: Evenement[];
  couleurs: Map<string, string>; erreurs: Map<string, string>;
}) {
  const places = new Map(personnes.map((m) => [m.id, disposer(evenements.filter((e) => e.membreId === m.id), jour)]));
  const toutes = [...places.values()].flat();
  // 8 h – 20 h d'ordinaire ; la grille s'élargit d'elle-même pour un vol à 6 h ou un dîner à 22 h.
  const premiere = Math.min(8, ...toutes.map((p) => Math.floor(p.debut / 60)));
  const derniere = Math.max(20, ...toutes.map((p) => Math.ceil(p.fin / 60)));
  const heures = Array.from({ length: derniere - premiere }, (_, i) => premiere + i);
  const maintenant = jour === aujourdhui ? minutesDansLeJour(new Date()) : null;
  const gabarit = { gridTemplateColumns: `56px repeat(${personnes.length}, minmax(200px, 1fr))` };

  return (
    <div className="min-w-fit">
      <div className="sticky top-0 z-20 grid border-b border-bord-2 bg-fond" style={gabarit}>
        <div />
        {personnes.map((m) => (
          <div key={m.id} className="border-l border-bord-2 px-3 py-2.5">
            <Qui personne={m} agendas={agendas.filter((a) => a.membreId === m.id)} couleurs={couleurs} erreurs={erreurs} />
            <div className="mt-2 flex flex-col gap-1">
              {evenements.filter((e) => e.membreId === m.id && couvre(e, jour)).map((e) => <Pastille key={e.id} e={e} couleur={couleurs.get(e.agendaId)} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="relative grid" style={gabarit}>
        <div>
          {heures.map((h) => (
            <div key={h} className="relative pr-2 text-right text-[11.5px] tabular-nums text-texte-faible" style={{ height: HAUTEUR_HEURE }}>
              {/* Le libellé se cale sur sa ligne ; la première, collée à l'en-tête, reste dessous pour se lire. */}
              <span className={`relative ${h === premiere ? "top-0.5" : "-top-2"}`}>{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        {personnes.map((m) => (
          <div key={m.id} className="relative border-l border-bord-2">
            {heures.map((h) => <div key={h} className="border-t border-bord-2/70" style={{ height: HAUTEUR_HEURE }} />)}
            {(places.get(m.id) ?? []).map((p) => {
              const top = ((p.debut - premiere * 60) / 60) * HAUTEUR_HEURE;
              const hauteur = Math.max(((p.fin - p.debut) / 60) * HAUTEUR_HEURE, 20);
              const couleur = couleurs.get(p.evenement.agendaId) ?? "var(--accent)";
              const e = p.evenement;
              const Balise = e.lien ? "a" : "div";
              return (
                <Balise key={e.id} {...(e.lien ? { href: e.lien, target: "_blank", rel: "noreferrer" } : {})}
                  title={`${heureDe(new Date(e.debut))}–${heureDe(new Date(e.fin))} · ${e.titre}${e.lieu ? ` · ${e.lieu}` : ""}`}
                  className="absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[12px] leading-tight text-texte hover:brightness-95"
                  style={{
                    top, height: hauteur - 2,
                    left: `calc(${(p.colonne / p.colonnes) * 100}% + 3px)`, width: `calc(${100 / p.colonnes}% - 6px)`,
                    borderLeftColor: couleur, background: `color-mix(in srgb, ${couleur} 16%, var(--surface))`,
                  }}>
                  <span className="block truncate font-medium">{e.titre}</span>
                  {hauteur > 34 && <span className="block truncate text-texte-sourd tabular-nums">{heureDe(new Date(e.debut))}–{heureDe(new Date(e.fin))}{e.lieu ? ` · ${e.lieu}` : ""}</span>}
                </Balise>
              );
            })}
          </div>
        ))}
        {maintenant !== null && maintenant >= premiere * 60 && maintenant <= derniere * 60 && (
          <div aria-hidden className="pointer-events-none absolute right-0 z-10 h-0.5 bg-accent" style={{ left: 56, top: ((maintenant - premiere * 60) / 60) * HAUTEUR_HEURE }}>
            <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-accent" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ les petits morceaux */

/** La personne, et la légende de ses agendas : une pastille de couleur par agenda, rouge s'il ne répond pas. */
function Qui({ personne, agendas, couleurs, erreurs }: { personne: Personne; agendas: Agenda[]; couleurs: Map<string, string>; erreurs: Map<string, string> }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Initiale nom={personne.nom} avatar={personne.avatar} grande />
        <span className="truncate text-[14px] font-medium">{personne.nom}</span>
      </div>
      {agendas.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {agendas.map((a) => (
            <li key={a.id} title={erreurs.get(a.id) ?? a.nom} className="flex items-center gap-1.5 text-[11.5px] text-texte-sourd">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: couleurs.get(a.id) }} />
              <span className="truncate">{a.nom}</span>
              {erreurs.has(a.id) && <span className="flex-none text-bloque">· muet</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Vide() {
  return (
    <div className="mx-auto mt-24 max-w-md px-6 text-center">
      <p className="text-[17px] font-medium tracking-tight">Aucun agenda branché</p>
      <p className="mt-2 text-[14.5px] leading-relaxed text-texte-sourd">
        Branchez votre Google, vos Outlook, ou le lien iCal de n’importe qui : tout le monde verra la semaine de chacun, ici.
        Le bouton est en haut à droite — « Agendas ».
      </p>
    </div>
  );
}

function Fleche({ vers, libelle, sens }: { vers: string; libelle: string; sens: "gauche" | "droite" }) {
  return (
    <Link href={vers} aria-label={libelle} title={libelle} className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-texte-sourd hover:bg-surface-2 hover:text-texte">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={sens === "gauche" ? "rotate-180" : ""}><path d="M4 2l4 4-4 4" /></svg>
    </Link>
  );
}

const jourDate = (j: string) => new Date(j + "T12:00:00Z");
const nomJour = (j: string) => jourDate(j).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
const libelleJourLong = (j: string) => { const l = jourDate(j).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); return l.charAt(0).toUpperCase() + l.slice(1); };
function libelleSemaine(du: string, au: string) {
  const f = (j: string, mois: boolean) => jourDate(j).toLocaleDateString("fr-FR", { day: "numeric", ...(mois ? { month: "short" } : {}), timeZone: "UTC" });
  return du.slice(5, 7) === au.slice(5, 7) ? `${f(du, false)} – ${f(au, true)}` : `${f(du, true)} – ${f(au, true)}`;
}

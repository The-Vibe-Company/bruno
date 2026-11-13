import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { lire, lister } from "@/api/agendas";
import type { Evenement } from "@/api/contrat";
import { microsoftConfigure } from "@/agenda/fournisseurs";
import { ajouterJours, heureDe, minutesDansLeJour } from "@/agenda/periode";
import { sessionCourante } from "@/auth/serveur";
import { FiltreMembres } from "@/board/FiltreMembres";
import { Agendas } from "@/calendrier/Agendas";
import { Fiche, type Source } from "@/calendrier/Fiche";
import { couvre, disposer, type Place } from "@/calendrier/disposition";
import { db } from "@/db/client";
import { membre } from "@/db/schema";
import { allegerAvatars } from "@/lib/avatar-url";
import { lundiDe } from "@/lib/dates";
import { membresActifs } from "@/lib/filtre-membres";
import { filtreMembres } from "@/lib/filtre-membres-serveur";
import { PALETTE } from "@/reglages/palette";
import { instant } from "@/relances/temps";

export const dynamic = "force-dynamic";

type Vue = "semaine" | "jour";
type Personne = { id: string; nom: string; avatar: string | null };

/**
 * Le Calendrier : un seul agenda, où se superposent ceux de chacun. Bruno n'y écrit rien — il lit
 * le Google, les Outlook, les liens iCal que chacun a branchés. Les visages, en haut, allument et
 * éteignent les gens ; chacun a sa couleur, et son anneau sert de légende.
 */
export default async function Calendrier({ searchParams }: {
  searchParams: Promise<{ jour?: string; vue?: string; branche?: string; erreur?: string; membres?: string }>;
}) {
  const session = await sessionCourante();
  if (!session) redirect("/api/auth/google");
  const p = await searchParams;
  const aujourdhui = instant().jour;
  const vue: Vue = p.vue === "jour" ? "jour" : "semaine";
  const jour = p.jour && /^\d{4}-\d{2}-\d{2}$/.test(p.jour) ? p.jour : aujourdhui;
  const du = vue === "semaine" ? lundiDe(jour) : jour;
  const au = vue === "semaine" ? ajouterJours(du, 6) : jour;

  const [membres, agendas] = await Promise.all([
    db.select({ id: membre.id, nom: membre.nom, avatar: membre.avatar }).from(membre)
      .where(and(eq(membre.spaceId, session.spaceId), eq(membre.actif, true), eq(membre.type, "humain")))
      .orderBy(asc(membre.createdAt)).then((l) => allegerAvatars(l, (m) => m.id)),
    lister(session),
  ]);
  // Soi en premier : c'est son agenda qu'on branche, et celui qu'on cherche des yeux.
  const personnes: Personne[] = [...membres.filter((m) => m.id === session.membreId), ...membres.filter((m) => m.id !== session.membreId)];
  // Le même filtre que le Daily : l'URL, sinon le dernier choix gardé ; tout le monde par défaut.
  const actifs = membresActifs(await filtreMembres(p.membres), personnes);
  const lecture = await lire(session, du, au, actifs);

  // Une couleur par personne, pas par agenda : sur une grille commune, c'est qui qu'on cherche.
  const couleurPersonne = Object.fromEntries(personnes.map((m, i) => [m.id, PALETTE[i % PALETTE.length]]));
  const couleurs = Object.fromEntries(agendas.map((a) => [a.id, couleurPersonne[a.membreId] ?? PALETTE[7]]));
  const erreurs = Object.fromEntries(lecture.erreurs.map((e) => [e.agendaId, e.message]));
  const noms = Object.fromEntries(personnes.map((m) => [m.id, m.nom]));
  const avatars = Object.fromEntries(personnes.map((m) => [m.id, m.avatar]));
  const sources: Record<string, Source> = Object.fromEntries(agendas.map((a) => [a.id, { qui: noms[a.membreId] ?? "?", avatar: avatars[a.membreId] ?? null, agenda: a.nom, origine: a.origine }]));
  const muets = agendas.filter((a) => erreurs[a.id]);

  const lien = (j: string, v: Vue = vue) => {
    const q = new URLSearchParams({ ...(j !== aujourdhui ? { jour: j } : {}), ...(v !== "semaine" ? { vue: v } : {}), ...(p.membres ? { membres: p.membres } : {}) });
    return `/calendrier${q.size ? `?${q}` : ""}`;
  };
  const pas = vue === "semaine" ? 7 : 1;
  const jours = Array.from({ length: vue === "semaine" ? 7 : 1 }, (_, i) => ajouterJours(du, i));

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
        <FiltreMembres membres={personnes} retenus={[...actifs]} />
        <span className="flex h-8 items-center rounded-lg border border-bord-2 bg-surface p-0.5 text-[13px]">
          {(["semaine", "jour"] as const).map((v) => (
            <Link key={v} href={lien(v === "jour" && vue === "semaine" && du <= aujourdhui && aujourdhui <= au ? aujourdhui : jour, v)} aria-current={v === vue ? "page" : undefined}
              className={`flex h-full items-center rounded-md px-2.5 ${v === vue ? "bg-surface-2 font-medium text-texte" : "text-texte-sourd hover:text-texte"}`}>
              {v === "semaine" ? "Semaine" : "Jour"}
            </Link>
          ))}
        </span>
        <Agendas personnes={personnes} agendas={agendas} moiId={session.membreId} couleurs={couleurs} erreurs={erreurs} outlookPret={microsoftConfigure()} />
      </header>

      {(p.branche || p.erreur) && (
        <p role={p.erreur ? "alert" : "status"} className={`mx-5 mt-3 rounded-lg border px-3 py-2 text-[13.5px] ${p.erreur ? "border-bloque/40 bg-bloque-voile" : "border-en-cours/40 bg-en-cours-voile"}`}>
          {p.erreur ?? `Agenda branché : ${p.branche}.`}
        </p>
      )}
      {muets.length > 0 && (
        <p className="mx-5 mt-3 text-[13px] text-texte-sourd">
          <span className="text-bloque">Muet</span> : {muets.map((a) => `${a.nom} (${noms[a.membreId] ?? "?"})`).join(", ")} — voir « Agendas ».
        </p>
      )}

      <main className="min-h-0 flex-1 overflow-auto">
        {agendas.length === 0 ? (
          <Vide />
        ) : (
          <Grille jours={jours} aujourdhui={aujourdhui} evenements={lecture.evenements} couleurs={couleurs} sources={sources}
            lienJour={vue === "semaine" ? (j) => lien(j, "jour") : undefined} />
        )}
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ la grille */

const HAUTEUR_HEURE = 48;

/** Une colonne par jour, heure par heure ; les réunions de tout le monde s'y partagent la place. */
function Grille({ jours, aujourdhui, evenements, couleurs, sources, lienJour }: {
  jours: string[]; aujourdhui: string; evenements: Evenement[];
  couleurs: Record<string, string>; sources: Record<string, Source>; lienJour?: (j: string) => string;
}) {
  const places = new Map(jours.map((j) => [j, disposer(evenements, j)]));
  const toutes = [...places.values()].flat();
  // 8 h – 20 h d'ordinaire ; la grille s'élargit d'elle-même pour un vol à 6 h ou un dîner à 22 h.
  const premiere = Math.min(8, ...toutes.map((p) => Math.floor(p.debut / 60)));
  const derniere = Math.max(20, ...toutes.map((p) => Math.ceil(p.fin / 60)));
  const heures = Array.from({ length: derniere - premiere }, (_, i) => premiere + i);
  const maintenant = minutesDansLeJour(new Date());
  const gabarit = { gridTemplateColumns: `56px repeat(${jours.length}, minmax(${jours.length === 7 ? 110 : 0}px, 1fr))` };
  const journees = jours.map((j) => evenements.filter((e) => couvre(e, j)));

  return (
    <div className={jours.length === 7 ? "min-w-[900px]" : ""}>
      <div className="sticky top-0 z-20 grid border-b border-bord-2 bg-fond" style={gabarit}>
        <div />
        {jours.map((j, i) => {
          const entete = (
            <span className={`block text-[12.5px] ${j === aujourdhui ? "font-semibold text-accent" : "text-texte-sourd"}`}>{lienJour ? nomJour(j) : libelleJourLong(j)}</span>
          );
          return (
            <div key={j} className={`flex min-w-0 flex-col gap-1 border-l border-bord-2 px-1.5 py-2 ${j === aujourdhui ? "bg-accent-voile/40" : ""}`}>
              {lienJour ? <Link href={lienJour(j)} title="Voir la journée" className="px-1 hover:text-texte">{entete}</Link> : <span className="px-1">{entete}</span>}
              {journees[i].map((e) => <Pastille key={e.id} e={e} couleur={couleurs[e.agendaId]} source={sources[e.agendaId]} />)}
            </div>
          );
        })}
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
        {jours.map((j) => (
          <div key={j} className={`relative min-w-0 border-l border-bord-2 ${j === aujourdhui ? "bg-accent-voile/20" : ""}`}>
            {heures.map((h) => <div key={h} className="border-t border-bord-2/70" style={{ height: HAUTEUR_HEURE }} />)}
            {(places.get(j) ?? []).map((p) => <Bloc key={p.evenement.id} p={p} premiere={premiere} couleur={couleurs[p.evenement.agendaId]} source={sources[p.evenement.agendaId]} />)}
            {j === aujourdhui && maintenant >= premiere * 60 && maintenant <= derniere * 60 && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-accent" style={{ top: ((maintenant - premiere * 60) / 60) * HAUTEUR_HEURE }}>
                <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-accent" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bloc({ p, premiere, couleur = "var(--accent)", source }: { p: Place; premiere: number; couleur?: string; source?: Source }) {
  const e = p.evenement;
  const qui = source?.qui;
  const top = ((p.debut - premiere * 60) / 60) * HAUTEUR_HEURE;
  const hauteur = Math.max(((p.fin - p.debut) / 60) * HAUTEUR_HEURE, 18);
  const horaire = `${heureDe(new Date(e.debut))}–${heureDe(new Date(e.fin))}`;
  return (
    <Fiche e={e} couleur={couleur} source={source}>
      <button type="button" title={`${qui ? `${qui} · ` : ""}${horaire} · ${e.titre}${e.lieu ? ` · ${e.lieu}` : ""}`}
        className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[12px] leading-tight text-texte outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          top, height: hauteur - 2,
          left: `calc(${(p.colonne / p.colonnes) * 100}% + 2px)`, width: `calc(${100 / p.colonnes}% - 4px)`,
          background: `color-mix(in srgb, ${couleur} 30%, var(--surface))`,
        }}>
        <span className="block truncate font-medium">{e.titre}</span>
        {hauteur > 32 && <span className="block truncate tabular-nums text-texte-sourd">{horaire}{qui ? ` · ${qui}` : ""}</span>}
      </button>
    </Fiche>
  );
}

function Pastille({ e, couleur = "var(--accent)", source }: { e: Evenement; couleur?: string; source?: Source }) {
  return (
    <Fiche e={e} couleur={couleur} source={source}>
      <button type="button" title={`${source ? `${source.qui} · ` : ""}Toute la journée · ${e.titre}`}
        className="block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[12px] font-medium text-texte outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent"
        style={{ background: `color-mix(in srgb, ${couleur} 24%, transparent)` }}>
        {e.titre}
      </button>
    </Fiche>
  );
}

/* ------------------------------------------------------------------ les petits morceaux */

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

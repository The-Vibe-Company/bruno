import Link from "next/link";
import { redirect } from "next/navigation";
import { lire, lister } from "@/api/agendas";
import { microsoftConfigure } from "@/agenda/fournisseurs";
import { ajouterJours } from "@/agenda/periode";
import { sessionCourante } from "@/auth/serveur";
import { FiltreMembres } from "@/board/FiltreMembres";
import { Agendas } from "@/calendrier/Agendas";
import { Avis } from "@/calendrier/Avis";
import { Grille, libelleJourLong } from "@/calendrier/Grille";
import { habiller, personnesDuCalendrier } from "@/calendrier/habillage";
import { lundiDe } from "@/lib/dates";
import { membresActifs } from "@/lib/filtre-membres";
import { filtreMembres } from "@/lib/filtre-membres-serveur";
import { instant } from "@/relances/temps";

export const dynamic = "force-dynamic";

type Vue = "semaine" | "jour";

/**
 * Le Calendrier : un seul agenda, où se superposent ceux de chacun. Bruno n'y écrit rien — il lit
 * le Google, les Outlook, les liens iCal que chacun a branchés. Les visages, en haut, allument et
 * éteignent les gens ; chacun a sa couleur, et un Agenda peut avoir la sienne.
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

  const [personnes, agendas] = await Promise.all([personnesDuCalendrier(session), lister(session)]);
  // Le même filtre que le Daily : l'URL, sinon le dernier choix gardé ; tout le monde par défaut.
  const actifs = membresActifs(await filtreMembres(p.membres), personnes);
  const lecture = await lire(session, du, au, actifs);

  const { couleurPersonne, couleurs, noms, sources } = habiller(personnes, agendas);
  const erreurs = Object.fromEntries(lecture.erreurs.map((e) => [e.agendaId, e.message]));
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
        <Agendas personnes={personnes} agendas={agendas} moiId={session.membreId} couleurs={couleurs} couleursPersonnes={couleurPersonne} erreurs={erreurs} outlookPret={microsoftConfigure()} />
      </header>

      {(p.branche || p.erreur) && <Avis message={p.erreur ?? `Agenda branché : ${p.branche}.`} erreur={Boolean(p.erreur)} />}
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
function libelleSemaine(du: string, au: string) {
  const f = (j: string, mois: boolean) => jourDate(j).toLocaleDateString("fr-FR", { day: "numeric", ...(mois ? { month: "short" } : {}), timeZone: "UTC" });
  return du.slice(5, 7) === au.slice(5, 7) ? `${f(du, false)} – ${f(au, true)}` : `${f(du, true)} – ${f(au, true)}`;
}

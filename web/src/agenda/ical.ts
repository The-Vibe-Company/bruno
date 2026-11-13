/**
 * Lire un lien iCal : l'adresse secrète qu'Outlook (« Publier un calendrier ») et Google
 * (« Adresse secrète au format iCal ») savent donner. C'est le chemin qui marche toujours, même
 * quand l'OAuth est fermé — un Gmail perso, l'Outlook d'un client.
 *
 * Le fichier contient tout l'agenda, récurrences comprises ; on ne garde que ce qui touche la
 * période, en dépliant les séries (avec leurs exceptions) le temps qu'il faut.
 */
import ICAL from "ical.js";
import { FUSEAU } from "@/relances/temps";
import { minuit } from "./periode";

export type EvenementLu = {
  id: string;
  titre: string;
  /** Un instant ISO, ou un jour AAAA-MM-JJ quand l'événement dure toute la journée. */
  debut: string;
  /** Exclusif. Un jour entier du 13 finit le 14. */
  fin: string;
  journee: boolean;
  lieu: string | null;
  lien: string | null;
  /** En texte brut, coupée : c'est pour lire la réunion en grand, pas pour la recopier. */
  description: string | null;
  /** Les noms, à défaut les adresses, de ceux qui sont invités. */
  participants: string[];
  /** Le lien pour rejoindre en visio, quand il y en a un. */
  visio: string | null;
};

const DESCRIPTION_MAX = 4000;

/** Une description en texte : Google et Outlook la donnent parfois en HTML. */
export function enTexte(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!t) return null;
  return t.length > DESCRIPTION_MAX ? `${t.slice(0, DESCRIPTION_MAX)}…` : t;
}

const VISIO = /https:\/\/(?:meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|[\w-]+\.zoom\.us|zoom\.us|whereby\.com|meet\.jit\.si)\/[^\s<>"')\]]+/i;

/** Le lien de visio : celui que le fournisseur donne, sinon le premier trouvé dans le lieu ou la description. */
export function trouverVisio(...sources: (string | null | undefined)[]): string | null {
  for (const s of sources) { const m = s?.match(VISIO); if (m) return m[0]; }
  return null;
}

/** Une série sans fin ne se déplie pas à l'infini : au-delà, c'est un fichier qui ment. */
const MAX_OCCURRENCES = 2000;

const jourIso = (t: ICAL.Time) =>
  `${String(t.year).padStart(4, "0")}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;

/**
 * Un `ICAL.Time` en instant. Quand le fichier nomme un fuseau sans le décrire (TZID=Europe/Paris
 * sans VTIMEZONE), ical.js le croit « flottant » ; on le relit alors dans ce fuseau s'il est connu,
 * sinon dans celui de Bruno — jamais en UTC, qui décalerait tout d'une ou deux heures.
 */
function instant(t: ICAL.Time, tzid: string | undefined): Date {
  const flottant = !t.zone || t.zone.tzid === "floating";
  if (!flottant) return t.toJSDate();
  const fuseau = tzid && estFuseau(tzid) ? tzid : FUSEAU;
  const debutJour = minuit(jourIso(t), fuseau).getTime();
  return new Date(debutJour + ((t.hour * 60 + t.minute) * 60 + t.second) * 1000);
}

function estFuseau(tzid: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: tzid }); return true; } catch { return false; }
}

function texte(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function lireIcs(contenu: string, du: Date, au: Date): EvenementLu[] {
  const racine = new ICAL.Component(ICAL.parse(contenu));
  const vevents = racine.getAllSubcomponents("vevent");

  // Les exceptions d'une série (RECURRENCE-ID) se rattachent à leur série avant de déplier.
  const series = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Component[] = [];
  for (const c of vevents) {
    if (c.hasProperty("recurrence-id")) exceptions.push(c);
    else series.set(String(c.getFirstPropertyValue("uid") ?? crypto.randomUUID()), new ICAL.Event(c));
  }
  for (const c of exceptions) {
    const parent = series.get(String(c.getFirstPropertyValue("uid")));
    if (parent) parent.relateException(c);
    else series.set(`${c.getFirstPropertyValue("uid")}#${c.getFirstPropertyValue("recurrence-id")}`, new ICAL.Event(c));
  }

  const sortie: EvenementLu[] = [];
  const details = (e: ICAL.Event) => {
    const description = enTexte(e.description);
    const lieu = texte(e.location);
    const participants = e.attendees.map((a) => {
      const nom = a.getParameter("cn");
      return typeof nom === "string" && nom.trim() ? nom.trim() : String(a.getFirstValue() ?? "").replace(/^mailto:/i, "");
    }).filter(Boolean);
    const conference = texte(e.component.getFirstPropertyValue("x-google-conference"));
    return { lieu, lien: texte(e.component.getFirstPropertyValue("url")), description, participants, visio: conference ?? trouverVisio(lieu, description) };
  };
  const garder = (e: ICAL.Event, debut: ICAL.Time, fin: ICAL.Time, cle: string) => {
    if (String(e.component.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") return;
    const journee = debut.isDate;
    const tzDebut = e.component.getFirstProperty("dtstart")?.getParameter("tzid") as string | undefined;
    const tzFin = (e.component.getFirstProperty("dtend") ?? e.component.getFirstProperty("dtstart"))?.getParameter("tzid") as string | undefined;
    if (journee) {
      // Une journée entière : on compare des jours, pas des instants — elle vaut partout la même date.
      const j0 = jourIso(debut);
      const j1 = fin.compare(debut) > 0 ? jourIso(fin) : j0;
      const finJour = j1 > j0 ? j1 : ajouterUnJour(j0);
      if (minuit(finJour).getTime() <= du.getTime() || minuit(j0).getTime() >= au.getTime()) return;
      sortie.push({ id: cle, titre: e.summary || "(sans titre)", debut: j0, fin: finJour, journee: true, ...details(e) });
      return;
    }
    const a = instant(debut, tzDebut);
    const b = fin.compare(debut) > 0 ? instant(fin, tzFin) : a;
    // Dans la période : commence avant sa fin, et finit après son début (un instant ponctuel compte s'il y tombe).
    const dedans = a < au && (b > du || (b.getTime() === a.getTime() && a >= du));
    if (!dedans) return;
    sortie.push({ id: cle, titre: e.summary || "(sans titre)", debut: a.toISOString(), fin: b.toISOString(), journee: false, ...details(e) });
  };

  for (const [uid, e] of series) {
    if (!e.startDate) continue;
    if (!e.isRecurring()) {
      garder(e, e.startDate, e.endDate ?? e.startDate, uid);
      continue;
    }
    const it = e.iterator();
    for (let n = 0, t = it.next(); t && n < MAX_OCCURRENCES; t = it.next(), n++) {
      const d = e.getOccurrenceDetails(t);
      const debut = d.startDate.isDate ? minuit(jourIso(d.startDate)) : instant(d.startDate, undefined);
      if (debut.getTime() >= au.getTime()) break;
      garder(d.item, d.startDate, d.endDate, `${uid}@${d.recurrenceId.toString()}`);
    }
  }

  return sortie.sort((x, y) => (x.debut < y.debut ? -1 : x.debut > y.debut ? 1 : 0));
}

function ajouterUnJour(jour: string): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * `webcal://` est le même lien que `https://` — Outlook et Google donnent l'un ou l'autre. On refuse
 * tout ce qui n'est pas public : le serveur de Bruno ne va pas lire une adresse de son propre réseau.
 */
export function normaliserLien(brut: string): URL {
  let url: URL;
  try { url = new URL(brut.trim().replace(/^webcals?:\/\//i, "https://")); }
  catch { throw new Error("Ce n'est pas une adresse."); }
  if (url.protocol !== "https:") throw new Error("Le lien doit commencer par https:// ou webcal://.");
  const hote = url.hostname.toLowerCase();
  if (hote === "localhost" || hote.endsWith(".local") || hote.endsWith(".internal") || /^[\d.]+$/.test(hote) || hote.includes(":")) {
    throw new Error("Ce lien ne pointe pas vers un calendrier en ligne.");
  }
  return url;
}

/** De quoi le dire à l'écran : un lien Outlook se reconnaît à son hôte, un lien Google aussi. */
export function origineDuLien(url: string): "outlook" | "google" | "autre" {
  const hote = (() => { try { return new URL(url.replace(/^webcals?:\/\//i, "https://")).hostname; } catch { return ""; } })();
  if (/(^|\.)outlook\.(office365|office|live)\.com$|(^|\.)office365\.com$/.test(hote)) return "outlook";
  if (/(^|\.)google\.com$/.test(hote)) return "google";
  return "autre";
}

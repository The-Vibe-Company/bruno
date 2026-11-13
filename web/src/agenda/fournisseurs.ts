/**
 * Google et Microsoft : brancher un compte (OAuth, en lecture seule), puis lire ses événements.
 *
 * Le retour d'OAuth passe par `/api/auth/callback`, l'adresse déjà déclarée chez Google pour la
 * connexion : l'état commence par `agenda.` et la route sait que ce n'est pas une connexion.
 * Chez Microsoft, la même adresse est à déclarer sur l'application Azure (voir .env.example).
 */
import { decodeJwt } from "jose";
import { GOOGLE, reglage } from "@/auth/config";
import { urlRetour } from "@/auth/oauth";
import { enTexte, trouverVisio, type EvenementLu } from "./ical";

export type FournisseurOAuth = "google" | "microsoft";

const MICROSOFT = {
  autorisation: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  jeton: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  portees: "openid email profile offline_access User.Read Calendars.Read",
};
const PORTEES_GOOGLE = "openid email https://www.googleapis.com/auth/calendar.readonly";

/** Outlook ne marche qu'une fois l'application Azure créée. Sans elle, le bouton le dit. */
export const microsoftConfigure = () => Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

function identifiants(f: FournisseurOAuth) {
  return f === "google"
    ? { id: reglage("GOOGLE_CLIENT_ID"), secret: reglage("GOOGLE_CLIENT_SECRET"), jeton: GOOGLE.jeton }
    : { id: process.env.MICROSOFT_CLIENT_ID ?? "", secret: process.env.MICROSOFT_CLIENT_SECRET ?? "", jeton: MICROSOFT.jeton };
}

export function urlAutorisation(f: FournisseurOAuth, request: Request, etat: string): string {
  const url = new URL(f === "google" ? GOOGLE.autorisation : MICROSOFT.autorisation);
  url.searchParams.set("client_id", identifiants(f).id);
  url.searchParams.set("redirect_uri", urlRetour(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", etat);
  if (f === "google") {
    url.searchParams.set("scope", PORTEES_GOOGLE);
    // Sans `offline` et `consent`, Google ne rend pas de jeton de rafraîchissement : l'Agenda mourrait en une heure.
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent select_account");
  } else {
    url.searchParams.set("scope", MICROSOFT.portees);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("prompt", "select_account");
  }
  return url.toString();
}

async function demanderJeton(f: FournisseurOAuth, corps: Record<string, string>) {
  const { id, secret, jeton } = identifiants(f);
  const r = await fetch(jeton, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...corps }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await r.json().catch(() => ({}))) as {
    access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number; error?: string; error_description?: string;
  };
  if (!r.ok || !json.access_token) {
    throw new Error(`${f === "google" ? "Google" : "Microsoft"} a refusé (${r.status}) : ${json.error ?? "?"}${json.error_description ? ` — ${json.error_description}` : ""}`);
  }
  return json;
}

/** Le code contre un jeton de rafraîchissement, et l'adresse du compte pour le nommer. */
export async function echangerCodeAgenda(f: FournisseurOAuth, request: Request, code: string) {
  const j = await demanderJeton(f, { code, redirect_uri: urlRetour(request), grant_type: "authorization_code", ...(f === "microsoft" ? { scope: MICROSOFT.portees } : {}) });
  if (!j.refresh_token) throw new Error("Le compte n'a pas donné d'accès durable. Retirez Bruno des applis autorisées du compte, puis recommencez.");
  // Le jeton d’identité arrive directement du fournisseur, en TLS : on le lit sans le revérifier.
  const claims = j.id_token ? decodeJwt(j.id_token) : {};
  const email = String(claims.email ?? claims.preferred_username ?? claims.upn ?? "").toLowerCase();
  if (!email) throw new Error("Impossible de savoir quel compte a été branché.");
  return { email, refreshToken: j.refresh_token };
}

/** Les jetons d'accès vivent une heure : on les garde en mémoire le temps de leur vie, pas en base. */
const acces = new Map<string, { jeton: string; expire: number }>();

/**
 * Un jeton d'accès frais. Microsoft fait tourner ses jetons de rafraîchissement : quand il en
 * rend un nouveau, `remplacer` le range — sinon l'ancien finit par expirer et l'Agenda se tait.
 */
export async function jetonAcces(f: FournisseurOAuth, agendaId: string, refreshToken: string, remplacer: (nouveau: string) => Promise<void>) {
  const garde = acces.get(agendaId);
  if (garde && garde.expire > Date.now() + 60_000) return garde.jeton;
  const j = await demanderJeton(f, { refresh_token: refreshToken, grant_type: "refresh_token", ...(f === "microsoft" ? { scope: MICROSOFT.portees } : {}) });
  acces.set(agendaId, { jeton: j.access_token!, expire: Date.now() + (j.expires_in ?? 3600) * 1000 });
  if (j.refresh_token && j.refresh_token !== refreshToken) await remplacer(j.refresh_token);
  return j.access_token!;
}

export const oublierAcces = (agendaId: string) => acces.delete(agendaId);

type EvenementGoogle = {
  id: string; status?: string; summary?: string; location?: string; htmlLink?: string; eventType?: string;
  start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string; email?: string; displayName?: string; resource?: boolean }[];
  hangoutLink?: string; description?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

/** L'agenda principal du compte. Les agendas partagés des collègues y seraient en double. */
export async function evenementsGoogle(jeton: string, du: Date, au: Date): Promise<EvenementLu[]> {
  const sortie: EvenementLu[] = [];
  let page: string | undefined;
  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", du.toISOString());
    url.searchParams.set("timeMax", au.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    if (page) url.searchParams.set("pageToken", page);
    const r = await fetch(url, { headers: { authorization: `Bearer ${jeton}` }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`Google Agenda répond ${r.status}${r.status === 403 ? " — l'API Google Calendar est-elle activée dans la console ?" : ""}`);
    const json = (await r.json()) as { items?: EvenementGoogle[]; nextPageToken?: string };
    for (const e of json.items ?? []) {
      if (e.status === "cancelled" || e.eventType === "workingLocation") continue;
      if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
      const journee = Boolean(e.start?.date);
      const debut = journee ? e.start!.date! : new Date(e.start?.dateTime ?? "").toISOString();
      const fin = journee ? (e.end?.date ?? e.start!.date!) : new Date(e.end?.dateTime ?? e.start?.dateTime ?? "").toISOString();
      const description = enTexte(e.description);
      const visio = e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? trouverVisio(e.location, description);
      const participants = (e.attendees ?? []).filter((a) => !a.resource).map((a) => a.displayName || a.email || "").filter(Boolean);
      sortie.push({ id: e.id, titre: e.summary || "(sans titre)", debut, fin, journee, lieu: e.location ?? null, lien: e.htmlLink ?? null, description, participants, visio });
    }
    page = json.nextPageToken;
  } while (page);
  return sortie;
}

type EvenementGraph = {
  id: string; subject?: string; isAllDay?: boolean; isCancelled?: boolean; webLink?: string;
  start: { dateTime: string }; end: { dateTime: string };
  location?: { displayName?: string }; responseStatus?: { response?: string };
  bodyPreview?: string; onlineMeeting?: { joinUrl?: string } | null;
  attendees?: { type?: string; emailAddress?: { name?: string; address?: string } }[];
};

/** Le calendrier par défaut, déplié par Graph (`calendarView` rend chaque occurrence). Heures en UTC. */
export async function evenementsMicrosoft(jeton: string, du: Date, au: Date): Promise<EvenementLu[]> {
  const sortie: EvenementLu[] = [];
  let url: string | undefined = (() => {
    const u = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
    u.searchParams.set("startDateTime", du.toISOString());
    u.searchParams.set("endDateTime", au.toISOString());
    u.searchParams.set("$top", "200");
    u.searchParams.set("$select", "id,subject,isAllDay,isCancelled,webLink,start,end,location,responseStatus,bodyPreview,onlineMeeting,attendees");
    return u.toString();
  })();
  while (url) {
    const r = await fetch(url, { headers: { authorization: `Bearer ${jeton}`, prefer: 'outlook.timezone="UTC"' }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`Outlook répond ${r.status}`);
    const json = (await r.json()) as { value?: EvenementGraph[]; "@odata.nextLink"?: string };
    for (const e of json.value ?? []) {
      if (e.isCancelled || e.responseStatus?.response === "declined") continue;
      const utc = (s: string) => new Date(s.endsWith("Z") ? s : `${s}Z`);
      // Une journée entière Outlook va de minuit à minuit, en UTC une fois demandé ainsi : la date suffit.
      const debut = e.isAllDay ? e.start.dateTime.slice(0, 10) : utc(e.start.dateTime).toISOString();
      const fin = e.isAllDay ? e.end.dateTime.slice(0, 10) : utc(e.end.dateTime).toISOString();
      const description = enTexte(e.bodyPreview);
      const lieu = e.location?.displayName || null;
      const participants = (e.attendees ?? []).filter((a) => a.type !== "resource").map((a) => a.emailAddress?.name || a.emailAddress?.address || "").filter(Boolean);
      sortie.push({
        id: e.id, titre: e.subject || "(sans titre)", debut, fin, journee: Boolean(e.isAllDay), lieu, lien: e.webLink ?? null,
        description, participants, visio: e.onlineMeeting?.joinUrl ?? trouverVisio(lieu, description),
      });
    }
    url = json["@odata.nextLink"];
  }
  return sortie;
}

import { beforeAll, describe, expect, it } from "vitest";
import { ouvrir, sceller } from "./coffre";
import { lireIcs, normaliserLien, origineDuLien } from "./ical";
import { jourDe, minuit } from "./periode";
import { disposer } from "@/calendrier/disposition";
import type { Evenement } from "@/api/contrat";

beforeAll(() => { process.env.SESSION_SECRET ??= "secret-de-test-assez-long-pour-hkdf"; });

describe("le coffre", () => {
  it("rend ce qu'on lui confie, et rien si on y touche", () => {
    const s = sceller("1//jeton-de-rafraichissement");
    expect(s).not.toContain("jeton");
    expect(ouvrir(s)).toBe("1//jeton-de-rafraichissement");
    const [v, iv, tag, corps] = s.split(".");
    const abime = [v, iv, tag, corps.slice(0, -2) + (corps.endsWith("A") ? "BB" : "AA")].join(".");
    expect(() => ouvrir(abime)).toThrow();
  });
});

describe("la période", () => {
  it("commence à minuit à Paris, heure d'hiver comme d'été", () => {
    expect(minuit("2026-11-16").toISOString()).toBe("2026-11-15T23:00:00.000Z");
    expect(minuit("2026-07-01").toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(minuit("2026-03-29").toISOString()).toBe("2026-03-28T23:00:00.000Z"); // le jour du passage à l'heure d'été
    expect(jourDe(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-16");
  });
});

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//FR
BEGIN:VTIMEZONE
TZID:Romance Standard Time
BEGIN:STANDARD
DTSTART:16010101T030000
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:16010101T020000
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
UID:hebdo
SUMMARY:Point MONKA
DTSTART;TZID=Romance Standard Time:20261005T100000
DTEND;TZID=Romance Standard Time:20261005T110000
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
BEGIN:VEVENT
UID:hebdo
RECURRENCE-ID;TZID=Romance Standard Time:20261116T100000
SUMMARY:Point MONKA (décalé)
DTSTART;TZID=Romance Standard Time:20261116T140000
DTEND;TZID=Romance Standard Time:20261116T150000
END:VEVENT
BEGIN:VEVENT
UID:conges
SUMMARY:Congés
DTSTART;VALUE=DATE:20261118
DTEND;VALUE=DATE:20261120
END:VEVENT
BEGIN:VEVENT
UID:annule
SUMMARY:Annulé
STATUS:CANCELLED
DTSTART:20261117T090000Z
DTEND:20261117T100000Z
END:VEVENT
BEGIN:VEVENT
UID:sans-vtimezone
SUMMARY:Déjeuner
DTSTART;TZID=Europe/Paris:20261117T123000
DTEND;TZID=Europe/Paris:20261117T140000
END:VEVENT
BEGIN:VEVENT
UID:avant
SUMMARY:Trop tôt
DTSTART:20261101T090000Z
DTEND:20261101T100000Z
END:VEVENT
END:VCALENDAR`;

describe("un lien iCal", () => {
  const evs = lireIcs(ICS, minuit("2026-11-16"), minuit("2026-11-23"));
  const titres = evs.map((e) => e.titre);

  it("déplie une série, avec ses exceptions, dans le fuseau d'Outlook", () => {
    expect(titres.filter((t) => t.startsWith("Point MONKA"))).toEqual(["Point MONKA (décalé)"]);
    const decale = evs.find((e) => e.titre === "Point MONKA (décalé)")!;
    expect(decale.debut).toBe("2026-11-16T13:00:00.000Z");
  });

  it("garde les journées entières en jours, fin exclusive", () => {
    expect(evs.find((e) => e.titre === "Congés")).toMatchObject({ journee: true, debut: "2026-11-18", fin: "2026-11-20" });
  });

  it("lit un fuseau nommé sans être décrit, ignore l'annulé et ce qui sort de la période", () => {
    expect(evs.find((e) => e.titre === "Déjeuner")?.debut).toBe("2026-11-17T11:30:00.000Z");
    expect(titres).not.toContain("Annulé");
    expect(titres).not.toContain("Trop tôt");
  });

  it("garde la semaine suivante pour la semaine suivante", () => {
    const suivante = lireIcs(ICS, minuit("2026-11-23"), minuit("2026-11-30"));
    expect(suivante.map((e) => e.debut)).toEqual(["2026-11-23T09:00:00.000Z"]);
  });
});

describe("les liens", () => {
  it("acceptent webcal, refusent le réseau local", () => {
    expect(normaliserLien("webcal://outlook.office365.com/owa/calendar/x/calendar.ics").protocol).toBe("https:");
    expect(() => normaliserLien("http://example.com/a.ics")).toThrow();
    expect(() => normaliserLien("https://localhost/a.ics")).toThrow();
    expect(() => normaliserLien("https://169.254.169.254/latest")).toThrow();
    expect(origineDuLien("https://outlook.office365.com/owa/calendar/x.ics")).toBe("outlook");
    expect(origineDuLien("https://calendar.google.com/calendar/ical/x/basic.ics")).toBe("google");
  });
});

describe("la grille d'une journée", () => {
  const ev = (id: string, debut: string, fin: string): Evenement => ({ id, agendaId: id, membreId: "m", titre: id, debut, fin, journee: false, lieu: null, lien: null });
  it("met côte à côte ce qui se chevauche, et en pleine largeur le reste", () => {
    const places = disposer([
      ev("a", "2026-11-16T08:00:00Z", "2026-11-16T09:00:00Z"), // 9 h–10 h à Paris
      ev("b", "2026-11-16T08:30:00Z", "2026-11-16T09:30:00Z"),
      ev("c", "2026-11-16T12:00:00Z", "2026-11-16T13:00:00Z"),
    ], "2026-11-16");
    const par = Object.fromEntries(places.map((p) => [p.evenement.id, p]));
    expect(par.a).toMatchObject({ debut: 540, fin: 600, colonne: 0, colonnes: 2 });
    expect(par.b).toMatchObject({ colonne: 1, colonnes: 2 });
    expect(par.c).toMatchObject({ colonne: 0, colonnes: 1 });
  });
});

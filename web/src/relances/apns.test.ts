import { afterEach, describe, expect, it } from "vitest";
import { reglages } from "./apns";

/**
 * Ce qui casse vraiment avec APNs n'est pas le protocole : c'est la clé, collée dans une variable
 * d'environnement qui lui mange ses retours à la ligne, et le mauvais serveur.
 */
const DEPART = { ...process.env };
afterEach(() => { process.env = { ...DEPART }; });

/** `process.env` ne connaît que des chaînes : y poser `undefined` écrirait le mot. */
const poser = (v: Record<string, string | undefined>) => {
  for (const [k, valeur] of Object.entries(v)) {
    if (valeur === undefined) delete process.env[k];
    else process.env[k] = valeur;
  }
};

describe("les réglages APNs", () => {
  it("se taisent tant que la clé n'est pas là — Bruno ne tombe pas, il n'envoie rien", () => {
    poser({ APNS_KEY: undefined, APNS_KEY_ID: undefined, APNS_TEAM_ID: undefined });
    expect(reglages()).toBeNull();
    poser({ APNS_KEY: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----", APNS_KEY_ID: "ABC1234567" });
    expect(reglages()).toBeNull();
  });

  it("rendent ses retours à la ligne à une clé collée d'un seul tenant", () => {
    poser({ APNS_KEY: "-----BEGIN PRIVATE KEY----- MIGxyz -----END PRIVATE KEY-----", APNS_KEY_ID: "ABC1234567", APNS_TEAM_ID: "K28B69CWQ7" });
    expect(reglages()!.cle).toBe("-----BEGIN PRIVATE KEY-----\nMIGxyz\n-----END PRIVATE KEY-----");
  });

  it("laissent intacte une clé qui a déjà les siens", () => {
    const vraie = "-----BEGIN PRIVATE KEY-----\nMIGxyz\n-----END PRIVATE KEY-----\n";
    poser({ APNS_KEY: vraie, APNS_KEY_ID: "ABC1234567", APNS_TEAM_ID: "K28B69CWQ7" });
    expect(reglages()!.cle).toBe(vraie);
  });

  it("parlent au serveur de production — TestFlight et l'App Store n'en connaissent pas d'autre", () => {
    poser({ APNS_KEY: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----", APNS_KEY_ID: "ABC1234567", APNS_TEAM_ID: "K28B69CWQ7", APNS_ENV: undefined });
    expect(reglages()!.hote).toBe("https://api.push.apple.com");
    expect(reglages()!.bundleId).toBe("co.thevibecompany.bruno");
    poser({ APNS_ENV: "sandbox" });
    expect(reglages()!.hote).toBe("https://api.sandbox.push.apple.com");
  });
});

"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nomAppareil } from "@/lib/appareil";
import type { Appareil } from "@/api/push";

async function appel<T>(chemin: string, method: string, corps?: unknown): Promise<T> {
  const r = await fetch(chemin, { method, headers: corps ? { "content-type": "application/json" } : undefined, body: corps ? JSON.stringify(corps) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
  return r.json();
}

/** La clé publique voyage en base64url ; `subscribe` la veut en octets, sur un tampon à elle. */
function octets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(base64);
  const tableau = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
  return tableau;
}

type Etat = "inconnu" | "impossible" | "refuse" | "a_activer" | "actif";

/**
 * Recevoir les Relances sur cet appareil. Le moteur les compose depuis toujours ; jusqu'ici elles
 * n'allaient que dans le journal. C'est le canal de l'ordinateur : sur iPhone, les Relances
 * passeront par l'app iOS et APNs (BRU-25), pas par le navigateur.
 */
export function Notifications({ clePublique, initiaux }: { clePublique: string; initiaux: Appareil[] }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const [liste, setListe] = useState(initiaux);
  const [etat, setEtat] = useState<Etat>("inconnu");
  const [ici, setIci] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [dit, setDit] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  // Ce que ce navigateur-ci sait faire, et s'il est déjà abonné : lui seul peut le dire.
  useEffect(() => {
    let vivant = true;
    (async () => {
      if (!clePublique || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) { setEtat("impossible"); return; }
      if (Notification.permission === "denied") { setEtat("refuse"); return; }
      const abo = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (!vivant) return;
      setIci(abo?.endpoint ?? null);
      setEtat(abo ? "actif" : "a_activer");
    })();
    return () => { vivant = false; };
  }, [clePublique]);

  const activer = async () => {
    setErreur(null); setDit(null); setOccupe(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== "granted") { setEtat("refuse"); return; }
      const abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets(clePublique) });
      const { endpoint, keys } = abo.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      setListe(await appel<Appareil[]>("/api/push/abonnements", "POST", { endpoint, ...keys, appareil: nomAppareil(navigator.userAgent) }));
      setIci(endpoint); setEtat("actif");
      demarrer(() => router.refresh());
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  const essayer = async () => {
    setErreur(null); setDit(null); setOccupe(true);
    try { await appel("/api/push/essai", "POST"); setDit("Envoyée."); }
    catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  };

  const retirer = async (a: Appareil) => {
    setErreur(null); setDit(null);
    try {
      setListe(await appel<Appareil[]>(`/api/push/abonnements/${a.id}`, "DELETE"));
      if (a.endpoint === ici) {
        await (await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription())?.unsubscribe();
        setIci(null); setEtat("a_activer");
      }
      demarrer(() => router.refresh());
    } catch (e) { setErreur((e as Error).message); }
  };

  return (
    <section>
      <header className="flex items-baseline justify-between border-b border-accent pb-2.5">
        <h2 className="text-xl font-medium tracking-tight">Mes Relances</h2>
        {etat === "actif" && <button onClick={essayer} disabled={occupe} className="text-[13.5px] text-accent hover:text-accent-survol disabled:opacity-50">Envoyer un essai</button>}
      </header>

      {erreur && <p role="alert" className="mt-3 rounded-lg border border-bloque/40 bg-bloque-voile px-3 py-2 text-sm">{erreur}</p>}
      {dit && <p role="status" className="mt-3 text-[13.5px] text-texte-sourd">{dit}</p>}

      <p className="mt-3.5 text-[14.5px] leading-relaxed text-texte-sourd">
        Le Point du matin, les Rappels et le Bilan arrivent en notification, aux heures ci-dessus.
      </p>

      {etat === "impossible" && <p className="mt-3 text-[14.5px] text-texte-faible">Ce navigateur ne sait pas les afficher.</p>}
      {etat === "refuse" && <p className="mt-3 text-[14.5px] text-texte-faible">Les notifications sont bloquées pour Bruno. À rouvrir dans les réglages du navigateur, puis revenir ici.</p>}
      {etat === "a_activer" && (
        <button onClick={activer} disabled={occupe} className="mt-4 h-10 rounded-lg bg-accent px-4 text-[14.5px] font-medium text-sur-accent disabled:opacity-50">
          {occupe ? "…" : "Activer sur cet appareil"}
        </button>
      )}

      {liste.length > 0 && (
        <ul className="mt-2">
          {liste.map((a) => (
            <li key={a.id} className="flex items-center gap-3 border-b border-bord-2 py-3">
              <span className="flex-1 text-[15.5px]">
                {a.appareil ?? "Cet appareil"}
                {a.endpoint === ici && <span className="ml-2 text-[13px] text-accent">celui-ci</span>}
              </span>
              <button onClick={() => retirer(a)} className="text-[13.5px] text-texte-sourd hover:text-texte">Retirer</button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3.5 text-[13.5px] leading-relaxed text-texte-faible">
        Sur iPhone, c’est l’app qui les reçoit : elle demande l’autorisation à son lancement, et apparaît alors dans cette liste.
      </p>
    </section>
  );
}

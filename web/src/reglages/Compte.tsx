"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Initiale } from "@/board/visuel";

/** Réduire une image en un petit rond : 160 px, JPEG — assez pour une pastille, pas de quoi peser. */
async function reduire(fichier: File): Promise<string> {
  const image = await createImageBitmap(fichier);
  const cote = Math.min(image.width, image.height);
  const toile = document.createElement("canvas");
  toile.width = 160; toile.height = 160;
  toile.getContext("2d")!.drawImage(image, (image.width - cote) / 2, (image.height - cote) / 2, cote, cote, 0, 0, 160, 160);
  return toile.toDataURL("image/jpeg", 0.85);
}

export function Compte({ nom, email, avatar }: { nom: string; email: string; avatar: string | null }) {
  const router = useRouter();
  const fichier = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function poser(valeur: string | null) {
    setOccupe(true); setErreur(null);
    try {
      const r = await fetch("/api/auth/moi", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ avatar: valeur }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `Erreur ${r.status}`);
      router.refresh();
    } catch (e) { setErreur((e as Error).message); }
    finally { setOccupe(false); }
  }

  return (
    <section>
      <header className="border-b border-accent pb-2.5"><h2 className="text-xl font-medium tracking-tight">Compte</h2></header>
      <div className="flex items-center gap-4 py-4">
        <button onClick={() => fichier.current?.click()} disabled={occupe} aria-label="Changer la photo" className="group relative h-14 w-14 overflow-hidden rounded-full">
          <span className="[&>*]:!h-14 [&>*]:!w-14 [&>*]:!text-xl"><Initiale nom={nom} avatar={avatar} /></span>
          <span className="absolute inset-0 flex items-center justify-center bg-fond-page/60 text-sur-accent opacity-0 transition-opacity group-hover:opacity-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 5.5h2.5l1.2-2h4.6l1.2 2H14v7.5H2z" /><circle cx="8" cy="9" r="2.4" /></svg>
          </span>
        </button>
        <input ref={fichier} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) poser(await reduire(f)); }} />
        <div className="flex-1">
          <p className="text-[15.5px]">{nom}</p>
          <p className="text-[13.5px] text-texte-sourd">{email}</p>
          <p className="mt-1 flex gap-3 text-[13px]">
            <button onClick={() => fichier.current?.click()} disabled={occupe} className="text-accent hover:text-accent-survol">{avatar ? "Changer la photo" : "Ajouter une photo"}</button>
            {avatar && <button onClick={() => poser(null)} disabled={occupe} className="text-texte-sourd hover:text-texte">Retirer</button>}
          </p>
          {erreur && <p role="alert" className="mt-1 text-[13px] text-bloque">{erreur}</p>}
        </div>
        {/* Une vraie navigation : le serveur efface le cookie et envoie sur la page de connexion. */}
        <form method="post" action="/api/auth/deconnexion"><button type="submit" className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Se déconnecter</button></form>
      </div>
    </section>
  );
}

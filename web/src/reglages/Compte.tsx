"use client";
import { useRouter } from "next/navigation";
import { Initiale } from "@/board/visuel";

export function Compte({ nom, email }: { nom: string; email: string }) {
  const router = useRouter();
  async function deconnecter() {
    await fetch("/api/auth/deconnexion", { method: "POST" });
    router.push("/"); router.refresh();
  }
  return (
    <section>
      <header className="border-b border-accent pb-2.5"><h2 className="text-xl font-medium tracking-tight">Compte</h2></header>
      <div className="flex items-center gap-3 py-4">
        <Initiale nom={nom} />
        <div className="flex-1"><p className="text-[15.5px]">{nom}</p><p className="text-[13.5px] text-texte-sourd">{email}</p></div>
        <button onClick={deconnecter} className="h-10 rounded-lg border border-bord-fort px-4 text-[14.5px]">Se déconnecter</button>
      </div>
    </section>
  );
}

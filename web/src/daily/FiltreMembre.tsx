import Link from "next/link";
import { Initiale } from "@/board/Carte";

/** `Tous`, puis une pastille par Membre : on déroule la réunion personne par personne. Porté par l'URL. */
export function FiltreMembre({ membres, courant, base }: { membres: { id: string; nom: string }[]; courant: string; base: string }) {
  const classe = (actif: boolean) => `flex items-center gap-2 rounded px-3.5 py-1.5 text-[15px] ${actif ? "bg-bord-2 text-texte" : "text-texte-sourd hover:text-texte"}`;
  return (
    <nav aria-label="Membre" className="flex gap-0.5 rounded-md border border-bord-faible p-0.5">
      <Link href={base} className={classe(!courant)} aria-current={!courant ? "true" : undefined}>Tous</Link>
      {membres.map((m) => (
        <Link key={m.id} href={`${base}?membre=${m.id}`} className={classe(courant === m.id)} aria-current={courant === m.id ? "true" : undefined}>
          <Initiale nom={m.nom} />{m.nom}
        </Link>
      ))}
    </nav>
  );
}

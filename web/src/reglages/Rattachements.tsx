"use client";
import { useState } from "react";
import { Affectations, AFFECTATIONS, PROJETS, type Affectation, type Vocabulaire } from "./Affectations";

/**
 * Les Affectations et les Projets, deux listes identiques : les empiler faisait deux titres et
 * deux fois la même chose à lire. Deux onglets, une liste à la fois.
 */
export function Rattachements({ affectations, projets }: { affectations: Affectation[]; projets: Affectation[] }) {
  const onglets: { mots: Vocabulaire; liste: Affectation[] }[] = [
    { mots: AFFECTATIONS, liste: affectations },
    { mots: PROJETS, liste: projets },
  ];
  const [actif, setActif] = useState(0);
  const { mots, liste } = onglets[actif];
  return (
    <section>
      <header className="flex items-center gap-1 border-b border-accent pb-2">
        {onglets.map((o, i) => (
          <button key={o.mots.titre} onClick={() => setActif(i)} aria-current={i === actif ? "true" : undefined}
            className={`h-8 rounded-lg px-3 text-[15px] font-medium tracking-tight ${i === actif ? "bg-surface-2 text-texte" : "text-texte-faible hover:text-texte-sourd"}`}>
            {o.mots.titre}
            <span className="ml-1.5 text-[12px] font-normal tabular-nums text-texte-faible">{o.liste.length}</span>
          </button>
        ))}
      </header>
      {/* `key` : changer d'onglet repart d'une liste propre, sans garder le formulaire de l'autre. */}
      <Affectations key={mots.chemin} initiales={liste} mots={mots} titre={false} />
    </section>
  );
}

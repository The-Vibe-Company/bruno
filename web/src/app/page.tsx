/**
 * Page provisoire : la palette, dans le thème du système. Elle sert à vérifier les tokens à
 * l'œil et disparaîtra avec le Board (BRU-14). Aucune couleur en dur ici — que des tokens.
 */
const GROUPES: { titre: string; tokens: string[] }[] = [
  { titre: "Fonds", tokens: ["fond-page", "fond", "surface", "surface-2", "surface-3"] },
  { titre: "Bords", tokens: ["bord", "bord-2", "bord-faible", "bord-fort"] },
  { titre: "Texte", tokens: ["texte", "texte-2", "texte-sourd", "texte-faible", "texte-tres-faible"] },
  { titre: "Accent", tokens: ["accent", "accent-survol", "sur-accent", "accent-voile", "accent-lueur"] },
  { titre: "Statuts", tokens: ["a-faire", "a-faire-voile", "en-cours", "en-cours-voile", "bloque", "bloque-voile"] },
];

export default function Accueil() {
  return (
    <main className="mx-auto w-full max-w-4xl p-10 flex flex-col gap-10">
      <header className="flex items-baseline gap-4 border-b border-accent pb-4">
        <span className="text-4xl font-semibold tracking-tight">
          Bruno<span className="text-accent">.</span>
        </span>
        <span className="text-texte-sourd">Les tokens, dans le thème de ton système</span>
      </header>

      {GROUPES.map((g) => (
        <section key={g.titre} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-texte-sourd">{g.titre}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {g.tokens.map((t) => (
              <li key={t} className="rounded-xl border border-bord bg-surface p-3 flex flex-col gap-2">
                <span
                  className="h-10 rounded-lg border border-bord-2"
                  style={{ background: `var(--${t})` }}
                />
                <code className="text-xs text-texte-sourd">{t}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-xl border border-bord bg-surface p-4 flex flex-col gap-3">
        <h2 className="text-sm font-medium text-texte-sourd">Ce que ça donne</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-sur-accent">Sur le feu</span>
          <span className="rounded-lg border border-bord-fort px-3 py-1.5 text-sm">À venir</span>
          <span className="rounded-lg border border-en-cours bg-en-cours-voile px-3 py-1.5 text-sm">En cours</span>
          <span className="rounded-lg border border-bloque bg-bloque-voile px-3 py-1.5 text-sm">Bloqué</span>
          <span className="text-sm text-texte-sourd">
            aujourd&apos;hui · <span className="text-accent">reporté 3×</span>
          </span>
        </div>
      </section>
    </main>
  );
}

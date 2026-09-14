/**
 * Ce qu'on voit le temps que la page arrive : le cadre est déjà là, le rail aussi. Sans ce
 * fichier, un clic dans le rail attend le serveur sans rien montrer — c'est ce qui donnait
 * l'impression que Bruno traîne.
 */
export default function Chargement() {
  return (
    <>
      <header className="flex h-12 flex-none items-center gap-5 border-b border-bord-2 px-5">
        <span className="h-4 w-24 animate-pulse rounded bg-bord-faible" />
      </header>
      <div className="flex-1 p-5">
        <span className="sr-only">Chargement…</span>
      </div>
    </>
  );
}

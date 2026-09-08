/** Les deux seuls signaux de santé de Bruno : ce qui attend d'être trié, ce qui a été reporté trois fois ou plus. */
export function Sante({ aTrier, reportees, seuil }: { aTrier: number; reportees: number; seuil: number }) {
  return (
    <div className="flex items-center">
      <Signal n={aTrier} libelle="à trier" />
      <span className="mx-4 h-7 w-px bg-bord-faible" />
      <Signal n={reportees} libelle={`reportées ${seuil} fois ou plus`} />
    </div>
  );
}

function Signal({ n, libelle }: { n: number; libelle: string }) {
  return (
    <span className="flex items-baseline gap-2.5">
      <span className={`text-[34px] font-light leading-none tracking-tighter tabular-nums ${n > 0 ? "text-accent" : "text-texte-faible"}`}>{n}</span>
      <span className="text-[15px] text-texte-sourd">{libelle}</span>
    </span>
  );
}

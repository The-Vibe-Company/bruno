import Link from "next/link";
import type { ReactNode } from "react";

/** Le rail de gauche et le cadre de page des maquettes web. Les entrées apparaissent au fur et à mesure que leurs pages existent. */
type Page = "board" | "daily" | "reglages";
const ENTREES: { page: Page; href: string; libelle: string; icone: ReactNode }[] = [
  { page: "board", href: "/", libelle: "Board", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="4" height="15" /><rect x="7" y="1.5" width="4" height="10" /><rect x="12.5" y="1.5" width="4" height="6" /></svg> },
  { page: "daily", href: "/daily", libelle: "Daily", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4.5l3 3L10 2" /><path d="M2 11.5l3 3L10 9" /><path d="M12.5 5h4M12.5 12h4" /></svg> },
  { page: "reglages", href: "/reglages", libelle: "Réglages", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="2.5" /><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" /></svg> },
];

export function Coquille({ children, initiale, page = "board" }: { children: ReactNode; initiale: string; page?: Page }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-14 flex-none flex-col items-center gap-1.5 border-r border-bord-2 py-4">
        <Link href="/" aria-label="Bruno" className="mb-5 flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent text-[19px] font-semibold leading-none tracking-tighter text-sur-accent">
          B<span className="ml-px mt-2 inline-block h-1 w-1 rounded-full bg-sur-accent" />
        </Link>
        {ENTREES.map((e) => (
          <Link key={e.page} href={e.href} aria-label={e.libelle} aria-current={e.page === page ? "page" : undefined}
            className={`flex h-11 w-14 items-center justify-center border-l-2 ${e.page === page ? "border-accent text-texte" : "border-transparent text-texte-faible hover:text-texte"}`}>
            {e.icone}
          </Link>
        ))}
        <span className="mt-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-bord-faible text-xs font-medium">{initiale}</span>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

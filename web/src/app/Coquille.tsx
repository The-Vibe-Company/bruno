import Link from "next/link";
import type { ReactNode } from "react";

/** Le rail de gauche et le cadre de page des maquettes web. Les entrées apparaissent au fur et à mesure que leurs pages existent. */
type Page = "board" | "daily" | "fait" | "recurrences" | "reglages";
const ENTREES: { page: Page; href: string; libelle: string; icone: ReactNode }[] = [
  { page: "board", href: "/", libelle: "Board", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="4" height="15" /><rect x="7" y="1.5" width="4" height="10" /><rect x="12.5" y="1.5" width="4" height="6" /></svg> },
  { page: "daily", href: "/daily", libelle: "Daily", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4.5l3 3L10 2" /><path d="M2 11.5l3 3L10 9" /><path d="M12.5 5h4M12.5 12h4" /></svg> },
  { page: "fait", href: "/fait", libelle: "Fait", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7" /><path d="M5.5 9.5l2.5 2.5 4.5-5" /></svg> },
  { page: "recurrences", href: "/recurrences", libelle: "Récurrences", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 9a6 6 0 1 1-1.8-4.3" /><path d="M15 2v4h-4" /></svg> },
  // Trois curseurs : des réglages, sans ambiguïté.
  { page: "reglages", href: "/reglages", libelle: "Réglages", icone: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4.5h14M2 9h14M2 13.5h14" /><circle cx="6" cy="4.5" r="1.8" fill="var(--fond)" /><circle cx="12" cy="9" r="1.8" fill="var(--fond)" /><circle cx="7.5" cy="13.5" r="1.8" fill="var(--fond)" /></svg> },
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

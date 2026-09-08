import Link from "next/link";
import type { ReactNode } from "react";

/** Le rail de gauche et le cadre de page des maquettes web. Les entrées apparaissent au fur et à mesure que leurs pages existent. */
export function Coquille({ children, initiale }: { children: ReactNode; initiale: string }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-14 flex-none flex-col items-center gap-1.5 border-r border-bord-2 py-4">
        <Link href="/" aria-label="Bruno" className="mb-5 flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent text-[19px] font-semibold leading-none tracking-tighter text-sur-accent">
          B<span className="ml-px mt-2 inline-block h-1 w-1 rounded-full bg-sur-accent" />
        </Link>
        <Link href="/" aria-label="Board" className="flex h-11 w-14 items-center justify-center border-l-2 border-accent">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="4" height="15" /><rect x="7" y="1.5" width="4" height="10" /><rect x="12.5" y="1.5" width="4" height="6" /></svg>
        </Link>
        <span className="mt-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-bord-faible text-xs font-medium">{initiale}</span>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

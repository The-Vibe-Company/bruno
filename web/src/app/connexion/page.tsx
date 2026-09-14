import { redirect } from "next/navigation";
import { sessionCourante } from "@/auth/serveur";

export const dynamic = "force-dynamic";

/**
 * La seule page publique. On y atterrit après une déconnexion, ou quand la connexion Google a
 * échoué — avec la raison en clair. Sans elle, un échec renvoyait sur `/`, qui renvoyait chez
 * Google, qui renvoyait sur `/`… et personne ne voyait jamais pourquoi.
 */
const RAISONS: Record<string, { titre: string; detail: string }> = {
  deconnecte: { titre: "Tu es déconnecté.", detail: "À tout à l’heure." },
  hors_domaine: { titre: "Ce compte n’est pas un compte The Vibe Company.", detail: "Connecte-toi avec ton adresse @thevibecompany.co." },
  desactive: { titre: "Ce compte a été désactivé.", detail: "Demande à Antoine de le réactiver dans les Réglages." },
  refusee: { titre: "Connexion annulée.", detail: "Tu as refusé chez Google. Rien de grave." },
  etat_invalide: { titre: "La connexion a expiré.", detail: "Le navigateur n’a pas gardé le fil avec Google — ça arrive après une longue pause, ou en navigation privée stricte. Réessaie." },
  code_manquant: { titre: "Google n’a rien renvoyé.", detail: "Réessaie. Si ça continue, dis-le à Antoine." },
  erreur: { titre: "La connexion a échoué.", detail: "Google ou Bruno a répondu de travers. Réessaie ; si ça continue, dis-le à Antoine." },
};

export default async function Connexion({ searchParams }: { searchParams: Promise<{ raison?: string }> }) {
  const { raison } = await searchParams;
  // Déjà connecté et pas de raison d'être ici : le Board.
  if (!raison && (await sessionCourante())) redirect("/");
  const message = raison ? RAISONS[raison] : null;
  return (
    <main className="flex flex-1 items-center justify-center bg-fond-page px-6">
      <section className="flex w-full max-w-[380px] flex-col items-center gap-6 rounded-2xl border border-bord bg-surface px-8 py-10 text-center shadow-2xl">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-[27px] font-semibold leading-none tracking-tighter text-sur-accent">B</span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[19px] font-semibold tracking-tight">{message?.titre ?? "Bruno"}</h1>
          <p className="text-[14px] text-texte-sourd">{message?.detail ?? "La to-do de The Vibe Company."}</p>
        </div>
        <a href="/api/auth/google" className="flex h-11 w-full items-center justify-center rounded-lg bg-accent text-[15px] font-medium text-sur-accent hover:bg-accent-survol">
          Se connecter avec Google
        </a>
        <p className="text-[12.5px] text-texte-faible">Réservé aux comptes @thevibecompany.co.</p>
      </section>
    </main>
  );
}

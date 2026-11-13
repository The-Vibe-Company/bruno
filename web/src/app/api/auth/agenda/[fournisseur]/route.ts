import { debut } from "@/agenda/oauth";

/** Brancher un compte Google ou Microsoft sur soi. Le retour arrive sur /api/auth/callback. */
export async function GET(request: Request, { params }: { params: Promise<{ fournisseur: string }> }) {
  return debut(request, (await params).fournisseur);
}

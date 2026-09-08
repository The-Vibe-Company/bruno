/** Le modèle d'Anthropic, derrière l'interface `Modele`. Sans clé, pas de modèle — et c'est un état normal. */
import Anthropic from "@anthropic-ai/sdk";
import type { Modele } from "./analyser";

export const MODELE_PAR_DEFAUT = "claude-haiku-4-5-20251001";

export function modeleAnthropic(cle = process.env.ANTHROPIC_API_KEY, nom = process.env.BRUNO_LLM_MODELE ?? MODELE_PAR_DEFAUT): Modele | null {
  if (!cle) return null;
  const client = new Anthropic({ apiKey: cle, maxRetries: 1, timeout: 20_000 });
  return {
    async completer(consigne, texte) {
      const r = await client.messages.create({ model: nom, max_tokens: 300, system: consigne, messages: [{ role: "user", content: texte }] });
      return r.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    },
  };
}

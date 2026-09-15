import { describe, expect, it } from "vitest";
import { nomAppareil } from "./appareil";

/** Les agents mentent tous un peu : Chrome dit « Safari », Edge dit « Chrome ». L'ordre les départage. */
describe("nommer l'appareil", () => {
  it("Chrome sur Mac", () => {
    expect(nomAppareil("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")).toBe("Chrome sur Mac");
  });

  it("Safari sur iPhone — celui qui compte pour les notifications", () => {
    expect(nomAppareil("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari sur iPhone");
  });

  it("Edge ne se fait pas passer pour Chrome", () => {
    expect(nomAppareil("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0")).toBe("Edge sur Windows");
  });

  it("un agent qu'on ne reconnaît pas ne rend pas une ligne illisible", () => {
    expect(nomAppareil("quelque chose d'autre")).toBe("Cet appareil");
  });
});

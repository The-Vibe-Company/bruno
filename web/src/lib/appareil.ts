/**
 * Le nom d'un appareil, tel qu'il s'affichera dans les Réglages : « Chrome sur Mac ».
 *
 * On ne garde pas l'agent brut — il est long, illisible, et on n'en a besoin que pour une chose :
 * reconnaître lequel de ses appareils on retire. En cas de doute, « Cet appareil » vaut mieux
 * qu'une chaîne de caractères que personne ne lit.
 */
export function nomAppareil(agent: string): string {
  const systeme =
    /iPhone/.test(agent) ? "iPhone" :
    /iPad/.test(agent) ? "iPad" :
    /Macintosh|Mac OS X/.test(agent) ? "Mac" :
    /Android/.test(agent) ? "Android" :
    /Windows/.test(agent) ? "Windows" :
    /Linux/.test(agent) ? "Linux" : "";
  // L'ordre compte : Chrome et Edge se déclarent aussi « Safari », Edge se déclare aussi « Chrome ».
  const navigateur =
    /Edg\//.test(agent) ? "Edge" :
    /OPR\//.test(agent) ? "Opera" :
    /Firefox\//.test(agent) ? "Firefox" :
    /Chrome\//.test(agent) ? "Chrome" :
    /Safari\//.test(agent) ? "Safari" : "";
  if (navigateur && systeme) return `${navigateur} sur ${systeme}`;
  return navigateur || systeme || "Cet appareil";
}

/**
 * Les règles pures des Relances, partagées avec l'interface : rien d'autre que des nombres et des
 * fonctions — pas de base, pas de serveur — pour que le Board puisse les afficher.
 */

/**
 * Passé ce délai, le Point du matin demande « toujours sur MONKA ? » (règle 25). C'est la seule
 * protection contre une donnée qui devient fausse au bout d'un trimestre.
 */
export const JOURS_AFFECTATION_QUI_TRAINE = 14;
export const traine = (a: { joursOuverts: number }) => a.joursOuverts > JOURS_AFFECTATION_QUI_TRAINE;

ALTER TABLE "tache" ADD COLUMN "bloque_le" timestamp with time zone;--> statement-breakpoint
-- Ce qui est déjà bloqué l'est depuis sa dernière écriture : la meilleure approximation qu'on
-- ait, et elle ne ment que d'un jour ou deux. Sans elle, la contrainte ci-dessous refuserait.
UPDATE "tache" SET "bloque_le" = "updated_at" WHERE "statut" = 'bloque' AND "bloque_le" IS NULL;--> statement-breakpoint
ALTER TABLE "tache" ADD CONSTRAINT "tache_blocage_date" CHECK (("tache"."statut" = 'bloque') = ("tache"."bloque_le" IS NOT NULL));

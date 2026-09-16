-- Écrite pour ne pas se fâcher de trouver le travail déjà fait : les déploiements de
-- prévisualisation partagent la base de production, et l'un d'eux a déjà posé ces colonnes
-- avant que la migration ne soit renumérotée. Sur une base neuve, elle fait exactement
-- ce que drizzle avait généré.
DO $$ BEGIN
	CREATE TYPE "public"."canal_push" AS ENUM('web', 'ios');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "abonnement_push" ALTER COLUMN "p256dh" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abonnement_push" ALTER COLUMN "auth" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abonnement_push" ADD COLUMN IF NOT EXISTS "canal" "canal_push" DEFAULT 'web' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "abonnement_push" ADD CONSTRAINT "abonnement_push_cles_web" CHECK ("abonnement_push"."canal" <> 'web' OR ("abonnement_push"."p256dh" IS NOT NULL AND "abonnement_push"."auth" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

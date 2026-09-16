CREATE TYPE "public"."canal_push" AS ENUM('web', 'ios');--> statement-breakpoint
ALTER TABLE "abonnement_push" ALTER COLUMN "p256dh" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abonnement_push" ALTER COLUMN "auth" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abonnement_push" ADD COLUMN "canal" "canal_push" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "abonnement_push" ADD CONSTRAINT "abonnement_push_cles_web" CHECK ("abonnement_push"."canal" <> 'web' OR ("abonnement_push"."p256dh" IS NOT NULL AND "abonnement_push"."auth" IS NOT NULL));
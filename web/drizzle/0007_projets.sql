CREATE TYPE "public"."genre_rattachement" AS ENUM('affectation', 'projet');--> statement-breakpoint
ALTER TABLE "affectation" DROP CONSTRAINT "affectation_nom_unique";--> statement-breakpoint
ALTER TABLE "affectation" ADD COLUMN "genre" "genre_rattachement" DEFAULT 'affectation' NOT NULL;--> statement-breakpoint
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_nom_unique" UNIQUE("space_id","genre","nom");
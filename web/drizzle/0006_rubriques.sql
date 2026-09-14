CREATE TYPE "public"."rubrique" AS ENUM('skills', 'projects', 'wins');--> statement-breakpoint
DROP INDEX "sujet_semaine";--> statement-breakpoint
ALTER TABLE "sujet" ADD COLUMN "rubrique" "rubrique" DEFAULT 'projects' NOT NULL;--> statement-breakpoint
CREATE INDEX "sujet_semaine" ON "sujet" USING btree ("space_id","lundi","rubrique");
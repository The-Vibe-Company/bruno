ALTER TABLE "tache" ADD COLUMN "depend_de_id" uuid;--> statement-breakpoint
ALTER TABLE "tache" ADD CONSTRAINT "tache_depend_de" FOREIGN KEY ("depend_de_id") REFERENCES "public"."tache"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache" ADD CONSTRAINT "tache_depend_pas_de_soi" CHECK ("tache"."depend_de_id" IS NULL OR "tache"."depend_de_id" <> "tache"."id");
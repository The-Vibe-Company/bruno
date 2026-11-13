CREATE TYPE "public"."fournisseur_agenda" AS ENUM('google', 'microsoft', 'ical');--> statement-breakpoint
CREATE TABLE "agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"fournisseur" "fournisseur_agenda" NOT NULL,
	"nom" text NOT NULL,
	"secret" text NOT NULL,
	"ajoute_par_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_unique" UNIQUE("membre_id","fournisseur","nom"),
	CONSTRAINT "agenda_nom" CHECK (length(btrim("agenda"."nom")) > 0)
);
--> statement-breakpoint
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_ajoute_par_id_membre_id_fk" FOREIGN KEY ("ajoute_par_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agenda_par_space" ON "agenda" USING btree ("space_id","membre_id");
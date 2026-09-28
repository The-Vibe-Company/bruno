CREATE TABLE "journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"affectation_id" uuid NOT NULL,
	"auteur_id" uuid,
	"texte" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_texte_non_vide" CHECK (length(btrim("journal"."texte")) > 0)
);
--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_affectation_id_affectation_id_fk" FOREIGN KEY ("affectation_id") REFERENCES "public"."affectation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal" ADD CONSTRAINT "journal_auteur_id_membre_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_par_affectation" ON "journal" USING btree ("affectation_id","created_at");
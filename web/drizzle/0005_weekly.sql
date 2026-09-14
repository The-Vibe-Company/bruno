CREATE TABLE "sujet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"lundi" date NOT NULL,
	"membre_id" uuid NOT NULL,
	"texte" text NOT NULL,
	"cree_par_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sujet_texte_non_vide" CHECK (length(btrim("sujet"."texte")) > 0)
);
--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sujet" ADD CONSTRAINT "sujet_cree_par_id_membre_id_fk" FOREIGN KEY ("cree_par_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sujet_semaine" ON "sujet" USING btree ("space_id","lundi");
CREATE TABLE "fichier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"tache_id" uuid NOT NULL,
	"auteur_id" uuid,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"octets" integer NOT NULL,
	"chemin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fichier_type" CHECK ("fichier"."type" in ('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf')),
	CONSTRAINT "fichier_taille" CHECK ("fichier"."octets" > 0 and "fichier"."octets" <= 20971520)
);
--> statement-breakpoint
ALTER TABLE "fichier" ADD CONSTRAINT "fichier_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichier" ADD CONSTRAINT "fichier_tache_id_tache_id_fk" FOREIGN KEY ("tache_id") REFERENCES "public"."tache"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichier" ADD CONSTRAINT "fichier_auteur_id_membre_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fichier_par_tache" ON "fichier" USING btree ("tache_id","created_at");
CREATE TABLE "image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"tache_id" uuid NOT NULL,
	"auteur_id" uuid,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"octets" integer NOT NULL,
	"contenu" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_type" CHECK ("image"."type" in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
	CONSTRAINT "image_taille" CHECK ("image"."octets" > 0 and "image"."octets" <= 5242880)
);
--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_tache_id_tache_id_fk" FOREIGN KEY ("tache_id") REFERENCES "public"."tache"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image" ADD CONSTRAINT "image_auteur_id_membre_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_par_tache" ON "image" USING btree ("tache_id","created_at");
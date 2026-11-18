CREATE TABLE "connexion_echangee" (
	"etat" text PRIMARY KEY NOT NULL,
	"membre_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connexion_echangee_etat_sha256" CHECK ("connexion_echangee"."etat" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "connexion_echangee" ADD CONSTRAINT "connexion_echangee_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connexion_echangee" ADD CONSTRAINT "connexion_echangee_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "jeton_api" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membre_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"empreinte" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	"revoque_le" timestamp with time zone,
	"dernier_usage" timestamp with time zone,
	CONSTRAINT "jeton_api_empreinte" UNIQUE("empreinte"),
	CONSTRAINT "jeton_api_nom" CHECK (length(btrim("jeton_api"."nom")) > 0),
	CONSTRAINT "jeton_api_empreinte_sha256" CHECK ("jeton_api"."empreinte" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "jeton_api" ADD CONSTRAINT "jeton_api_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jeton_api" ADD CONSTRAINT "jeton_api_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jeton_api_par_membre" ON "jeton_api" USING btree ("space_id","membre_id");
CREATE TABLE "relance_envoyee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"jour" date NOT NULL,
	"heure" time NOT NULL,
	"nature" text NOT NULL,
	"titre" text NOT NULL,
	"corps" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relance_envoyee_unique" UNIQUE("membre_id","jour","heure")
);
--> statement-breakpoint
ALTER TABLE "relance_envoyee" ADD CONSTRAINT "relance_envoyee_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relance_envoyee" ADD CONSTRAINT "relance_envoyee_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;
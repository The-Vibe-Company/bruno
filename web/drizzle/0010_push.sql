CREATE TABLE "abonnement_push" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"appareil" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abonnement_push_endpoint" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "abonnement_push" ADD CONSTRAINT "abonnement_push_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abonnement_push" ADD CONSTRAINT "abonnement_push_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;
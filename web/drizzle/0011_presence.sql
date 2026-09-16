CREATE TABLE "presence" (
	"membre_id" uuid PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"page" text NOT NULL,
	"vu_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "presence_par_space" ON "presence" USING btree ("space_id","vu_le");
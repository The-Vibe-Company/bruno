CREATE TYPE "public"."bucket" AS ENUM('a_trier', 'sur_le_feu', 'a_venir', 'idees');--> statement-breakpoint
CREATE TYPE "public"."etat_terminal" AS ENUM('termine', 'abandonne');--> statement-breakpoint
CREATE TYPE "public"."frequence" AS ENUM('hebdomadaire', 'mensuelle');--> statement-breakpoint
CREATE TYPE "public"."membre_type" AS ENUM('humain', 'agent');--> statement-breakpoint
CREATE TYPE "public"."statut" AS ENUM('a_faire', 'en_cours', 'bloque');--> statement-breakpoint
CREATE TABLE "affectation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"couleur" text NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affectation_nom_unique" UNIQUE("space_id","nom")
);
--> statement-breakpoint
CREATE TABLE "affectation_membre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"affectation_id" uuid NOT NULL,
	"debut" date NOT NULL,
	"fin" date,
	CONSTRAINT "affectation_membre_periode" CHECK ("affectation_membre"."fin" IS NULL OR "affectation_membre"."fin" >= "affectation_membre"."debut")
);
--> statement-breakpoint
CREATE TABLE "creneau" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	"heure" time NOT NULL,
	CONSTRAINT "creneau_unique" UNIQUE("membre_id","heure"),
	CONSTRAINT "creneau_quart_heure" CHECK (extract(minute from "creneau"."heure") IN (0, 15, 30, 45)
                                   AND extract(second from "creneau"."heure") = 0)
);
--> statement-breakpoint
CREATE TABLE "membre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"email" text NOT NULL,
	"type" "membre_type" DEFAULT 'humain' NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membre_email_unique" UNIQUE("space_id","email")
);
--> statement-breakpoint
CREATE TABLE "recurrence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"assigne_id" uuid NOT NULL,
	"frequence" "frequence" NOT NULL,
	"jour_semaine" smallint,
	"jour_mois" smallint,
	"occurrences" smallint DEFAULT 1 NOT NULL,
	"decalages" smallint[] NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurrence_frequence_coherente" CHECK (
    ("recurrence"."frequence" = 'hebdomadaire' AND "recurrence"."jour_semaine" BETWEEN 1 AND 7 AND "recurrence"."jour_mois" IS NULL)
 OR ("recurrence"."frequence" = 'mensuelle'    AND "recurrence"."jour_mois" BETWEEN 1 AND 28 AND "recurrence"."jour_semaine" IS NULL)),
	CONSTRAINT "recurrence_occurrences" CHECK ("recurrence"."occurrences" BETWEEN 1 AND 12),
	CONSTRAINT "recurrence_decalages_alignes" CHECK (array_length("recurrence"."decalages", 1) = "recurrence"."occurrences" AND "recurrence"."decalages"[1] = 0)
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"tache_id" uuid NOT NULL,
	"auteur_id" uuid,
	"raison" text NOT NULL,
	"ancien_engagement" date NOT NULL,
	"nouvel_engagement" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_raison_obligatoire" CHECK (length(btrim("report"."raison")) > 0)
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"titre" text NOT NULL,
	"notes" text,
	"transcription_brute" text,
	"bucket" "bucket" DEFAULT 'a_trier' NOT NULL,
	"statut" "statut",
	"rang" numeric NOT NULL,
	"assigne_id" uuid,
	"engagement" date,
	"reports_count" integer DEFAULT 0 NOT NULL,
	"etat_terminal" "etat_terminal",
	"termine_le" timestamp with time zone,
	"recurrence_id" uuid,
	"cree_par_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tache_droit_entree_sur_le_feu" CHECK ("tache"."bucket" <> 'sur_le_feu' OR ("tache"."assigne_id" IS NOT NULL AND "tache"."engagement" IS NOT NULL)),
	CONSTRAINT "tache_statut_sur_le_feu" CHECK (("tache"."bucket" = 'sur_le_feu') = ("tache"."statut" IS NOT NULL)),
	CONSTRAINT "tache_fin_datee" CHECK (("tache"."etat_terminal" IS NULL) = ("tache"."termine_le" IS NULL)),
	CONSTRAINT "tache_titre_non_vide" CHECK (length(btrim("tache"."titre")) > 0),
	CONSTRAINT "tache_reports_positifs" CHECK ("tache"."reports_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tache_aidant" (
	"space_id" uuid NOT NULL,
	"tache_id" uuid NOT NULL,
	"membre_id" uuid NOT NULL,
	CONSTRAINT "tache_aidant_tache_id_membre_id_pk" PRIMARY KEY("tache_id","membre_id")
);
--> statement-breakpoint
ALTER TABLE "affectation" ADD CONSTRAINT "affectation_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affectation_membre" ADD CONSTRAINT "affectation_membre_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affectation_membre" ADD CONSTRAINT "affectation_membre_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affectation_membre" ADD CONSTRAINT "affectation_membre_affectation_id_affectation_id_fk" FOREIGN KEY ("affectation_id") REFERENCES "public"."affectation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creneau" ADD CONSTRAINT "creneau_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creneau" ADD CONSTRAINT "creneau_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membre" ADD CONSTRAINT "membre_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence" ADD CONSTRAINT "recurrence_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence" ADD CONSTRAINT "recurrence_assigne_id_membre_id_fk" FOREIGN KEY ("assigne_id") REFERENCES "public"."membre"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_tache_id_tache_id_fk" FOREIGN KEY ("tache_id") REFERENCES "public"."tache"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_auteur_id_membre_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache" ADD CONSTRAINT "tache_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache" ADD CONSTRAINT "tache_assigne_id_membre_id_fk" FOREIGN KEY ("assigne_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache" ADD CONSTRAINT "tache_cree_par_id_membre_id_fk" FOREIGN KEY ("cree_par_id") REFERENCES "public"."membre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache_aidant" ADD CONSTRAINT "tache_aidant_space_id_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."space"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache_aidant" ADD CONSTRAINT "tache_aidant_tache_id_tache_id_fk" FOREIGN KEY ("tache_id") REFERENCES "public"."tache"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tache_aidant" ADD CONSTRAINT "tache_aidant_membre_id_membre_id_fk" FOREIGN KEY ("membre_id") REFERENCES "public"."membre"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affectation_membre_courante" ON "affectation_membre" USING btree ("membre_id","fin");--> statement-breakpoint
CREATE INDEX "report_par_tache" ON "report" USING btree ("tache_id","created_at");--> statement-breakpoint
CREATE INDEX "tache_board" ON "tache" USING btree ("space_id","bucket","etat_terminal","rang");--> statement-breakpoint
CREATE INDEX "tache_engagement" ON "tache" USING btree ("space_id","assigne_id","engagement");
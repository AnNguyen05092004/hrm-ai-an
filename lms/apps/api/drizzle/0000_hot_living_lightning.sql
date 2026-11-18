CREATE TABLE "ai_usage" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_versions" (
	"artifact_id" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"content" jsonb NOT NULL,
	"source_versions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artifact_versions_artifact_id_version_pk" PRIMARY KEY("artifact_id","version")
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"kit_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_version" integer,
	"img" text DEFAULT 'server' NOT NULL,
	"share_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"user_id" text NOT NULL,
	"due" timestamp with time zone,
	"reason" text DEFAULT '' NOT NULL,
	"kpi_id" text,
	"skill_id" text,
	"assigned_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"version" integer NOT NULL,
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"questions" jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"grades" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"score" real,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"graded_by" text,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_chunks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"label" text NOT NULL,
	"jump" jsonb NOT NULL,
	"text" text NOT NULL,
	"src" text,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"proposed_level" integer,
	"confidence" text,
	"rationale" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"result" jsonb,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kits" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"goal" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"skill_id" text,
	"level" integer,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stage" text DEFAULT 'details' NOT NULL,
	"from_plan" jsonb,
	"img" text DEFAULT 'server' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpis" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"metric" text DEFAULT '' NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"current" text DEFAULT '' NOT NULL,
	"due" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trend" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"ai_monthly_tokens" integer DEFAULT 2000000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"needs" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"user_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"done" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"sessions" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp with time zone,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_user_id_artifact_id_pk" PRIMARY KEY("user_id","artifact_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"from_level" integer NOT NULL,
	"to_level" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_id" text,
	"by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"group" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_chunks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"source_id" text NOT NULL,
	"version" integer NOT NULL,
	"ord" integer NOT NULL,
	"section" text NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"error" text,
	"sensitive" boolean DEFAULT false NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutor_messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" jsonb NOT NULL,
	"found" boolean NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"user_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"level" integer NOT NULL,
	"source" text DEFAULT 'declared' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_skills_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"org_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" text DEFAULT 'learner' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"dept_id" text,
	"position_id" text,
	"manager_id" text,
	"color" text DEFAULT '#8b88c9' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kits" ADD CONSTRAINT "kits_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kits" ADD CONSTRAINT "kits_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kits" ADD CONSTRAINT "kits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_events" ADD CONSTRAINT "skill_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_events" ADD CONSTRAINT "skill_events_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_messages" ADD CONSTRAINT "tutor_messages_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dept_id_departments_id_fk" FOREIGN KEY ("dept_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_org" ON "ai_usage" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "artifacts_kit" ON "artifacts" USING btree ("kit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assign_uq" ON "assignments" USING btree ("artifact_id","user_id");--> statement-breakpoint
CREATE INDEX "attempts_user" ON "attempts" USING btree ("user_id","artifact_id");--> statement-breakpoint
CREATE INDEX "content_chunks_art" ON "content_chunks" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "jobs_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_chunks_src" ON "source_chunks" USING btree ("source_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");
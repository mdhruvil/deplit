CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"project_id" uuid NOT NULL,
	"git_commit_hash" text NOT NULL,
	"git_ref" text NOT NULL,
	"git_commit_message" text NOT NULL,
	"git_commit_author_name" text NOT NULL,
	"framework" text NOT NULL,
	"build_status" text DEFAULT 'IN_QUEUE' NOT NULL,
	"build_duration_ms" integer DEFAULT 0,
	"target" text NOT NULL,
	"activeState" text NOT NULL,
	"alias" text NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"github_url" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
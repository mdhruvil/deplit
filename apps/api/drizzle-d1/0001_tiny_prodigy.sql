ALTER TABLE `projects` ADD `full_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `framework` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `is_spa` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `deployments` DROP COLUMN `framework`;
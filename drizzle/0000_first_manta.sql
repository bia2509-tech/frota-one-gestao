CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_company_created` ON `audit_log` (`company_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`legal_name` text NOT NULL,
	`trade_name` text NOT NULL,
	`tax_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_companies_tax_id` ON `companies` (`tax_id`);--> statement-breakpoint
CREATE TABLE `company_users` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_company_users_company_user` ON `company_users` (`company_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_company_users_user` ON `company_users` (`user_id`);--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`number` text NOT NULL,
	`object` text NOT NULL,
	`supplier_id` text,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_contracts_company_number` ON `contracts` (`company_id`,`number`);--> statement-breakpoint
CREATE INDEX `idx_contracts_company_status_end` ON `contracts` (`company_id`,`status`,`ends_at`);--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`reference_month` text NOT NULL,
	`sequence` integer NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`approved_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_measurements_contract_sequence` ON `measurements` (`contract_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_measurements_company_month` ON `measurements` (`company_id`,`reference_month`);
ALTER TABLE `equipment` ADD `fuel_type` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `serial_number` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `owner_tax_id` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `lessor_tax_id` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `ownership_type` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `is_commodatum` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment` ADD `commodatum_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `commodatum_tax_id` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `tachograph_number` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `insurance_provider` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `insurance_policy_number` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `insurance_start_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `insurance_expiry_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `project_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `front_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `cost_center` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `operator_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `measurement_type` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `current_kilometer` integer;--> statement-breakpoint
ALTER TABLE `equipment` ADD `current_hourmeter` integer;
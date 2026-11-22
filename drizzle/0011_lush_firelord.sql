ALTER TABLE `equipment` ADD `equipment_type` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `brand` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `model` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `manufacture_year` integer;--> statement-breakpoint
ALTER TABLE `equipment` ADD `chassis` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `renavam` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `color` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `owner_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `lessor_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `arrival_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `departure_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `registration_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `crlv_expiry_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `tachograph_calibration_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `tachograph_expiry_date` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `entry_checklist_status` text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `equipment` ADD `observation` text;
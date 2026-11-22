CREATE TABLE `email_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`maintenance_order_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maintenance_order_id`) REFERENCES `maintenance_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_email_company_status` ON `email_notifications` (`company_id`,`status`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`fleet_number` text NOT NULL,
	`plate` text,
	`description` text NOT NULL,
	`lessor_id` text,
	`status` text DEFAULT 'available' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lessor_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_equipment_company_fleet` ON `equipment` (`company_id`,`fleet_number`);--> statement-breakpoint
CREATE INDEX `idx_equipment_company_plate` ON `equipment` (`company_id`,`plate`);--> statement-breakpoint
CREATE TABLE `maintenance_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`order_number` text NOT NULL,
	`maintenance_type` text NOT NULL,
	`description` text NOT NULL,
	`started_at` text NOT NULL,
	`status` text NOT NULL,
	`notify_lessor` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_maintenance_company_number` ON `maintenance_orders` (`company_id`,`order_number`);--> statement-breakpoint
CREATE INDEX `idx_maintenance_company_status` ON `maintenance_orders` (`company_id`,`status`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_suppliers_company_name` ON `suppliers` (`company_id`,`name`);--> statement-breakpoint
CREATE TABLE `user_module_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`company_user_id` text NOT NULL,
	`module` text NOT NULL,
	`can_view` integer DEFAULT false NOT NULL,
	`can_create` integer DEFAULT false NOT NULL,
	`can_update` integer DEFAULT false NOT NULL,
	`can_delete` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_user_id`) REFERENCES `company_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_permissions_user_module` ON `user_module_permissions` (`company_user_id`,`module`);--> statement-breakpoint
CREATE INDEX `idx_permissions_company_module` ON `user_module_permissions` (`company_id`,`module`);
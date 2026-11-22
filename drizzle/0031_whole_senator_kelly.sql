CREATE TABLE `appropriation_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`correction_id` text NOT NULL,
	`company_id` text NOT NULL,
	`equipment_id` text,
	`item_id` text NOT NULL,
	`scope` text NOT NULL,
	`reference_month` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`supplier_name` text,
	`field_name` text NOT NULL,
	`old_value` text NOT NULL,
	`new_value` text NOT NULL,
	`justification` text NOT NULL,
	`created_by` text NOT NULL,
	`created_by_name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_appropriation_adjustment_period` ON `appropriation_adjustments` (`company_id`,`reference_month`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_appropriation_adjustment_item` ON `appropriation_adjustments` (`company_id`,`item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_appropriation_adjustment_correction` ON `appropriation_adjustments` (`correction_id`);
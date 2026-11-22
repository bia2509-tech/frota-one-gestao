CREATE TABLE `deletion_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`module` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_label` text NOT NULL,
	`reason` text NOT NULL,
	`snapshot_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_by` text NOT NULL,
	`requested_by_name` text,
	`requested_at` text NOT NULL,
	`reviewed_by` text,
	`reviewed_by_name` text,
	`reviewed_at` text,
	`review_note` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX `idx_deletion_company_status` ON `deletion_requests` (`company_id`,`status`,`requested_at`);
CREATE INDEX `idx_deletion_entity` ON `deletion_requests` (`company_id`,`entity_type`,`entity_id`);

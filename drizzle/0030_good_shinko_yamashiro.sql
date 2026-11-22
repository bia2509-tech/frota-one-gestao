ALTER TABLE `quick_service_entries` ADD `system_number` integer;--> statement-breakpoint
UPDATE `quick_service_entries`
SET `system_number` = 1 + (
  SELECT COUNT(*)
  FROM `quick_service_entries` AS older
  WHERE older.`company_id` = `quick_service_entries`.`company_id`
    AND (
      older.`created_at` < `quick_service_entries`.`created_at`
      OR (older.`created_at` = `quick_service_entries`.`created_at` AND older.`id` < `quick_service_entries`.`id`)
    )
);--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_quick_service_company_system_number` ON `quick_service_entries` (`company_id`,`system_number`);

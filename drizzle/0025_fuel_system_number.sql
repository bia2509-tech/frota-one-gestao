ALTER TABLE `fuel_entries` ADD `system_number` integer;
UPDATE `fuel_entries`
SET `system_number` = 1 + (
  SELECT COUNT(*)
  FROM `fuel_entries` AS older
  WHERE older.`company_id` = `fuel_entries`.`company_id`
    AND (
      older.`created_at` < `fuel_entries`.`created_at`
      OR (older.`created_at` = `fuel_entries`.`created_at` AND older.`id` < `fuel_entries`.`id`)
    )
);
CREATE UNIQUE INDEX `uidx_fuel_company_system_number` ON `fuel_entries` (`company_id`,`system_number`);

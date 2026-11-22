DROP INDEX `uidx_master_company_type_name`;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_master_company_type_code_name` ON `master_data` (`company_id`,`type`,`code`,`name`);
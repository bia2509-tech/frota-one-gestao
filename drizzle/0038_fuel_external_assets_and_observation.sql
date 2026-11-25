-- Allow fuel transactions for authorized vehicles outside the managed fleet.
-- Preserve existing entries and dependent credit/stock movement records.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE `fuel_entries_new` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL REFERENCES `companies`(`id`),
  `equipment_id` text REFERENCES `equipment`(`id`),
  `system_number` integer,
  `entry_date` text NOT NULL,
  `rn` text,
  `station` text,
  `maintenance_location` text,
  `driver_name` text,
  `product` text NOT NULL,
  `product_code` text,
  `liters_milli` integer NOT NULL,
  `unit_price_milli` integer NOT NULL,
  `total_cents` integer NOT NULL,
  `kilometer` integer,
  `hourmeter` integer,
  `status` text NOT NULL DEFAULT 'confirmed',
  `source` text NOT NULL,
  `import_file_name` text,
  `entry_time` text,
  `requisition_coupon` text,
  `supplier_id` text REFERENCES `suppliers`(`id`),
  `invoice_id` text REFERENCES `fiscal_invoices`(`id`),
  `fuel_convoy_id` text,
  `cost_center` text,
  `receipt_object_key` text,
  `original_external_id` text,
  `source_fingerprint` text,
  `transaction_type` text NOT NULL DEFAULT 'consumption',
  `external_identifier` text,
  `external_asset_type` text,
  `external_company_name` text,
  `external_description` text,
  `observation` text,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL
);

INSERT INTO `fuel_entries_new` (
  `id`, `company_id`, `equipment_id`, `system_number`, `entry_date`, `rn`, `station`,
  `maintenance_location`, `driver_name`, `product`, `product_code`, `liters_milli`,
  `unit_price_milli`, `total_cents`, `kilometer`, `hourmeter`, `status`, `source`,
  `import_file_name`, `entry_time`, `requisition_coupon`, `supplier_id`, `invoice_id`,
  `fuel_convoy_id`, `cost_center`, `receipt_object_key`, `original_external_id`,
  `source_fingerprint`, `transaction_type`, `created_by`, `created_at`
)
SELECT
  `id`, `company_id`, `equipment_id`, `system_number`, `entry_date`, `rn`, `station`,
  `maintenance_location`, `driver_name`, `product`, `product_code`, `liters_milli`,
  `unit_price_milli`, `total_cents`, `kilometer`, `hourmeter`, `status`, `source`,
  `import_file_name`, `entry_time`, `requisition_coupon`, `supplier_id`, `invoice_id`,
  `fuel_convoy_id`, `cost_center`, `receipt_object_key`, `original_external_id`,
  `source_fingerprint`, `transaction_type`, `created_by`, `created_at`
FROM `fuel_entries`;

DROP TABLE `fuel_entries`;
ALTER TABLE `fuel_entries_new` RENAME TO `fuel_entries`;

CREATE INDEX `idx_fuel_company_date` ON `fuel_entries` (`company_id`,`entry_date`);
CREATE INDEX `idx_fuel_equipment_date` ON `fuel_entries` (`equipment_id`,`entry_date`);
CREATE UNIQUE INDEX `uidx_fuel_company_system_number` ON `fuel_entries` (`company_id`,`system_number`);
CREATE UNIQUE INDEX `uidx_fuel_company_rn` ON `fuel_entries` (`company_id`,`rn`);
CREATE UNIQUE INDEX `uidx_fuel_company_fingerprint` ON `fuel_entries` (`company_id`,`source_fingerprint`);
CREATE INDEX `idx_fuel_company_supplier_date` ON `fuel_entries` (`company_id`,`supplier_id`,`entry_date`);
CREATE INDEX `idx_fuel_company_convoy_date` ON `fuel_entries` (`company_id`,`fuel_convoy_id`,`entry_date`);

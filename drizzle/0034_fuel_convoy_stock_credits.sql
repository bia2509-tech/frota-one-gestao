ALTER TABLE `fuel_entries` ADD `entry_time` text;
ALTER TABLE `fuel_entries` ADD `requisition_coupon` text;
ALTER TABLE `fuel_entries` ADD `supplier_id` text REFERENCES `suppliers`(`id`);
ALTER TABLE `fuel_entries` ADD `invoice_id` text REFERENCES `fiscal_invoices`(`id`);
ALTER TABLE `fuel_entries` ADD `cost_center` text;
ALTER TABLE `fuel_entries` ADD `receipt_object_key` text;
ALTER TABLE `fuel_entries` ADD `original_external_id` text;
ALTER TABLE `fuel_entries` ADD `source_fingerprint` text;
ALTER TABLE `fuel_entries` ADD `transaction_type` text NOT NULL DEFAULT 'consumption';

CREATE TABLE `fuel_convoys` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL REFERENCES `companies`(`id`),
  `equipment_id` text NOT NULL REFERENCES `equipment`(`id`),
  `convoy_number` text NOT NULL,
  `maintenance_location_id` text,
  `maintenance_location` text,
  `cost_center` text,
  `supplier_id` text REFERENCES `suppliers`(`id`),
  `capacity_milli` integer NOT NULL DEFAULT 0,
  `opening_balance_milli` integer NOT NULL DEFAULT 0,
  `status` text NOT NULL DEFAULT 'active',
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE UNIQUE INDEX `uidx_fuel_convoy_company_number` ON `fuel_convoys` (`company_id`,`convoy_number`);
CREATE UNIQUE INDEX `uidx_fuel_convoy_equipment` ON `fuel_convoys` (`company_id`,`equipment_id`);
CREATE INDEX `idx_fuel_convoy_company_status` ON `fuel_convoys` (`company_id`,`status`);

ALTER TABLE `fuel_entries` ADD `fuel_convoy_id` text REFERENCES `fuel_convoys`(`id`);

CREATE TABLE `fuel_convoy_sequences` (
  `company_id` text PRIMARY KEY NOT NULL REFERENCES `companies`(`id`),
  `last_number` integer NOT NULL DEFAULT 0
);
INSERT INTO `fuel_convoys` (`id`,`company_id`,`equipment_id`,`convoy_number`,`maintenance_location`,`cost_center`,`capacity_milli`,`opening_balance_milli`,`status`,`created_by`,`created_at`,`updated_at`)
SELECT lower(hex(randomblob(16))), e.`company_id`, e.`id`, e.`fleet_number`, e.`project_name`, e.`cost_center`, 0, 0, 'active', 'system-migration', datetime('now'), datetime('now')
FROM `equipment` e
WHERE upper(coalesce(e.`equipment_type`, '')) LIKE '%COMBOIO%'
   OR upper(coalesce(e.`description`, '')) LIKE '%COMBOIO%'
ON CONFLICT (`company_id`,`equipment_id`) DO NOTHING;
INSERT INTO `fuel_convoy_sequences` (`company_id`,`last_number`)
SELECT `company_id`, max(CASE WHEN convoy_number NOT GLOB '*[^0-9]*' THEN cast(convoy_number AS integer) ELSE 0 END)
FROM `fuel_convoys` GROUP BY `company_id`
ON CONFLICT (`company_id`) DO UPDATE SET `last_number` = max(`last_number`, excluded.`last_number`);

CREATE TABLE `fiscal_credit_notes` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL REFERENCES `companies`(`id`),
  `supplier_id` text NOT NULL REFERENCES `suppliers`(`id`),
  `fiscal_invoice_id` text REFERENCES `fiscal_invoices`(`id`),
  `credit_number` text NOT NULL,
  `issue_date` text NOT NULL,
  `original_cents` integer NOT NULL,
  `remaining_cents` integer NOT NULL,
  `status` text NOT NULL DEFAULT 'available',
  `created_by` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX `uidx_credit_company_supplier_number_date` ON `fiscal_credit_notes` (`company_id`,`supplier_id`,`credit_number`,`issue_date`);
CREATE INDEX `idx_credit_company_supplier_status` ON `fiscal_credit_notes` (`company_id`,`supplier_id`,`status`);

CREATE TABLE `fuel_credit_usages` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL REFERENCES `companies`(`id`),
  `credit_note_id` text NOT NULL REFERENCES `fiscal_credit_notes`(`id`),
  `fuel_entry_id` text NOT NULL REFERENCES `fuel_entries`(`id`),
  `amount_cents` integer NOT NULL,
  `idempotency_key` text,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX `uidx_fuel_credit_usage_request` ON `fuel_credit_usages` (`company_id`,`idempotency_key`);
CREATE INDEX `idx_fuel_credit_usage_note` ON `fuel_credit_usages` (`company_id`,`credit_note_id`,`created_at`);
CREATE INDEX `idx_fuel_credit_usage_entry` ON `fuel_credit_usages` (`company_id`,`fuel_entry_id`);

CREATE TABLE `fuel_stock_movements` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL REFERENCES `companies`(`id`),
  `convoy_id` text NOT NULL REFERENCES `fuel_convoys`(`id`),
  `movement_type` text NOT NULL,
  `movement_date` text NOT NULL,
  `quantity_milli` integer NOT NULL,
  `delta_milli` integer NOT NULL,
  `unit_price_milli` integer NOT NULL DEFAULT 0,
  `total_cents` integer NOT NULL DEFAULT 0,
  `supplier_id` text REFERENCES `suppliers`(`id`),
  `invoice_id` text REFERENCES `fiscal_invoices`(`id`),
  `invoice_item_id` text REFERENCES `fiscal_invoice_items`(`id`),
  `fuel_entry_id` text REFERENCES `fuel_entries`(`id`),
  `destination_equipment_id` text REFERENCES `equipment`(`id`),
  `maintenance_location` text,
  `cost_center` text,
  `reference_key` text,
  `observation` text,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL
);
CREATE UNIQUE INDEX `uidx_fuel_movement_reference` ON `fuel_stock_movements` (`company_id`,`reference_key`);
CREATE INDEX `idx_fuel_movements_company_convoy_date` ON `fuel_stock_movements` (`company_id`,`convoy_id`,`movement_date`);
CREATE UNIQUE INDEX `uidx_fuel_movements_invoice_item` ON `fuel_stock_movements` (`company_id`,`invoice_item_id`);

CREATE UNIQUE INDEX `uidx_fuel_company_fingerprint` ON `fuel_entries` (`company_id`,`source_fingerprint`);
CREATE INDEX `idx_fuel_company_supplier_date` ON `fuel_entries` (`company_id`,`supplier_id`,`entry_date`);
CREATE INDEX `idx_fuel_company_convoy_date` ON `fuel_entries` (`company_id`,`fuel_convoy_id`,`entry_date`);

CREATE TRIGGER `fuel_credit_usage_guard`
BEFORE INSERT ON `fuel_credit_usages`
WHEN NOT EXISTS (
  SELECT 1 FROM `fiscal_credit_notes` c JOIN `fuel_entries` f ON f.`id` = NEW.`fuel_entry_id`
  WHERE c.`id` = NEW.`credit_note_id` AND c.`company_id` = NEW.`company_id`
    AND c.`status` = 'available' AND c.`remaining_cents` >= NEW.`amount_cents`
    AND f.`company_id` = NEW.`company_id` AND f.`supplier_id` = c.`supplier_id`
)
BEGIN SELECT RAISE(ABORT, 'Crédito indisponível, de outro fornecedor ou com saldo insuficiente.'); END;

CREATE TRIGGER `fuel_credit_usage_apply`
AFTER INSERT ON `fuel_credit_usages`
BEGIN
  UPDATE `fiscal_credit_notes`
  SET `remaining_cents` = `remaining_cents` - NEW.`amount_cents`,
      `status` = CASE WHEN `remaining_cents` - NEW.`amount_cents` = 0 THEN 'exhausted' ELSE 'available' END
  WHERE `id` = NEW.`credit_note_id` AND `company_id` = NEW.`company_id`;
END;

CREATE TRIGGER `fuel_stock_movement_guard`
BEFORE INSERT ON `fuel_stock_movements`
WHEN NOT EXISTS (
  SELECT 1 FROM `fuel_convoys` c
  WHERE c.`id` = NEW.`convoy_id` AND c.`company_id` = NEW.`company_id`
    AND c.`status` = 'active'
    AND c.`capacity_milli` > 0
    AND c.`opening_balance_milli` + coalesce((SELECT sum(m.`delta_milli`) FROM `fuel_stock_movements` m WHERE m.`company_id` = NEW.`company_id` AND m.`convoy_id` = NEW.`convoy_id`), 0) + NEW.`delta_milli` >= 0
    AND (NEW.`delta_milli` <= 0 OR c.`opening_balance_milli` + coalesce((SELECT sum(m.`delta_milli`) FROM `fuel_stock_movements` m WHERE m.`company_id` = NEW.`company_id` AND m.`convoy_id` = NEW.`convoy_id`), 0) + NEW.`delta_milli` <= c.`capacity_milli`)
)
BEGIN SELECT RAISE(ABORT, 'Saldo ou capacidade do comboio não permite esta movimentação.'); END;

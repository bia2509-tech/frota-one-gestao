CREATE TABLE `fiscal_invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`freight_cents` integer DEFAULT 0 NOT NULL,
	`ipi_cents` integer DEFAULT 0 NOT NULL,
	`icms_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer NOT NULL,
	`equipment_id` text,
	`maintenance_order_id` text,
	`service_description` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `fiscal_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maintenance_order_id`) REFERENCES `maintenance_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_invoice_items_invoice` ON `fiscal_invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_invoice_items_equipment` ON `fiscal_invoice_items` (`company_id`,`equipment_id`);--> statement-breakpoint
CREATE TABLE `fiscal_invoice_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`invoice_id` text NOT NULL,
	`installment` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_date` text NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'payable' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `fiscal_invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_invoice_payments_invoice` ON `fiscal_invoice_payments` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `fiscal_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`series` text,
	`issue_date` text NOT NULL,
	`entry_date` text NOT NULL,
	`due_date` text,
	`purchase_order` text,
	`cost_center` text NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`accounting_checked` integer DEFAULT false NOT NULL,
	`picked_up` integer DEFAULT false NOT NULL,
	`stock_updated` integer DEFAULT false NOT NULL,
	`observation` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_invoice_company_supplier_number_issue` ON `fiscal_invoices` (`company_id`,`supplier_id`,`invoice_number`,`issue_date`);--> statement-breakpoint
CREATE INDEX `idx_invoice_company_entry_status` ON `fiscal_invoices` (`company_id`,`entry_date`,`status`);
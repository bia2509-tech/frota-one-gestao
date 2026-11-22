CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`category` text NOT NULL,
	`item_type` text DEFAULT 'product' NOT NULL,
	`application` text,
	`manufacturer_reference` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_products_company_code` ON `products` (`company_id`,`code`);--> statement-breakpoint
CREATE INDEX `idx_products_company_name` ON `products` (`company_id`,`name`);--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `product_id` text REFERENCES products(id);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `trade_name` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `tax_id` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `state_registration` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `address` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `district` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `zip_code` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `city` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `state` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `contact_name` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `fax` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `freight_type` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `simple_national` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `pix_key` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `account_holder` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `account_type` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `bank` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `bank_agency` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `bank_account` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `financial_contact` text;
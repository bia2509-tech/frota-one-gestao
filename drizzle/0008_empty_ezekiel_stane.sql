ALTER TABLE `fiscal_invoice_items` ADD `ncm` text;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `cfop` text;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `cst` text;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `pis_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `cofins_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `iss_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `cbs_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `ibs_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_invoice_items` ADD `selective_tax_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `fiscal_invoices` ADD `access_key` text;--> statement-breakpoint
ALTER TABLE `fiscal_invoices` ADD `document_model` text;
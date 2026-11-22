ALTER TABLE `contracts` ADD `contract_type` text;--> statement-breakpoint
ALTER TABLE `contracts` ADD `monthly_rent_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `monthly_labor_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts` ADD `monthly_amount_cents` integer DEFAULT 0 NOT NULL;
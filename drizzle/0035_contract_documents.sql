CREATE TABLE `contract_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `company_id` text NOT NULL,
  `contract_id` text NOT NULL,
  `document_type` text NOT NULL,
  `file_name` text NOT NULL,
  `object_key` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `uploaded_by` text NOT NULL,
  `uploaded_at` text NOT NULL,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_contract_documents_contract` ON `contract_documents` (`company_id`, `contract_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_contract_documents_object` ON `contract_documents` (`object_key`);

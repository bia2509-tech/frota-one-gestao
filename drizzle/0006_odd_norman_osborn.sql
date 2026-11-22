ALTER TABLE `user_module_permissions` ADD `can_approve` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_module_permissions` ADD `can_cancel` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_module_permissions` ADD `can_reopen` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user_module_permissions` ADD `can_report` integer DEFAULT false NOT NULL;
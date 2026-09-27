CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_room` ON `history` (`room_id`,`revision`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`phase` text NOT NULL,
	`data` text NOT NULL,
	`status` text NOT NULL,
	`upload_id` text,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `media_room` ON `media` (`room_id`,`phase`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `upload_parts` (
	`id` text PRIMARY KEY NOT NULL,
	`media_id` text NOT NULL,
	`part_number` integer NOT NULL,
	`etag` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parts_media_number` ON `upload_parts` (`media_id`,`part_number`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`author` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer NOT NULL,
	`mutation_id` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

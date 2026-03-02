-- v1.1: Community features (remix, follows)
ALTER TABLE `contents` ADD `parentContentId` int;
--> statement-breakpoint
ALTER TABLE `contents` ADD `remixCount` int NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`followedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`)
);

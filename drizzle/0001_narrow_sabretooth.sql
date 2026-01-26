CREATE TABLE `apps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appStoreId` varchar(32) NOT NULL,
	`bundleId` varchar(256),
	`name` varchar(512) NOT NULL,
	`artistName` varchar(256),
	`artworkUrl100` text,
	`artworkUrl512` text,
	`summary` text,
	`categoryId` varchar(32),
	`price` decimal(10,2) DEFAULT '0',
	`currency` varchar(8) DEFAULT 'USD',
	`releaseDate` date,
	`averageRating` decimal(3,2),
	`ratingCount` int DEFAULT 0,
	`country` varchar(8) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apps_id` PRIMARY KEY(`id`),
	CONSTRAINT `apps_store_country_idx` UNIQUE(`appStoreId`,`country`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameJa` varchar(128),
	`isGame` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_categoryId_unique` UNIQUE(`categoryId`)
);
--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appId` int NOT NULL,
	`country` varchar(8) NOT NULL,
	`rankingType` enum('topgrossing','topfree','toppaid') NOT NULL,
	`categoryType` enum('all','games') NOT NULL DEFAULT 'all',
	`rank` int NOT NULL,
	`rankDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rankings_id` PRIMARY KEY(`id`),
	CONSTRAINT `rankings_unique_idx` UNIQUE(`appId`,`country`,`rankingType`,`categoryType`,`rankDate`)
);
--> statement-breakpoint
CREATE INDEX `apps_category_idx` ON `apps` (`categoryId`);--> statement-breakpoint
CREATE INDEX `rankings_app_idx` ON `rankings` (`appId`);--> statement-breakpoint
CREATE INDEX `rankings_date_idx` ON `rankings` (`rankDate`);--> statement-breakpoint
CREATE INDEX `rankings_country_type_date_idx` ON `rankings` (`country`,`rankingType`,`rankDate`);
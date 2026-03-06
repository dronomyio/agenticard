CREATE TABLE `agent_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL,
	`creditsPerRequest` decimal(10,2) NOT NULL DEFAULT '10.00',
	`totalCreditsPool` decimal(18,2) NOT NULL DEFAULT '1000.00',
	`capabilities` text,
	`nvmPlanId` varchar(128),
	`nvmAgentId` varchar(128),
	`endpoint` varchar(256),
	`isActive` boolean NOT NULL DEFAULT true,
	`totalRequests` int NOT NULL DEFAULT 0,
	`successRate` decimal(5,2) NOT NULL DEFAULT '100.00',
	`avgResponseTime` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('purchase','earn','refund','settlement') NOT NULL,
	`amount` decimal(18,6) NOT NULL,
	`balanceBefore` decimal(18,6) NOT NULL,
	`balanceAfter` decimal(18,6) NOT NULL,
	`description` varchar(512),
	`agentServiceId` int,
	`cardEnhancementId` int,
	`nvmPlanId` varchar(128),
	`status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'confirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credits` decimal(18,6) NOT NULL DEFAULT '1000.000000',
	`totalEarned` decimal(18,6) NOT NULL DEFAULT '0.000000',
	`totalSpent` decimal(18,6) NOT NULL DEFAULT '0.000000',
	`nvmPlanId` varchar(128),
	`nvmAgentId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `card_enhancements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardId` int NOT NULL,
	`userId` int NOT NULL,
	`agentServiceId` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`inputSnapshot` text,
	`enhancementResult` text,
	`creditsCharged` decimal(10,2) NOT NULL DEFAULT '0.00',
	`x402Token` varchar(512),
	`nvmTxId` varchar(128),
	`processingTimeMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `card_enhancements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`tags` text,
	`status` enum('draft','active','enhanced','archived') NOT NULL DEFAULT 'active',
	`enhancementCount` int NOT NULL DEFAULT 0,
	`coverGradient` varchar(128),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nvm_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentServiceId` int NOT NULL,
	`nvmPlanId` varchar(128),
	`creditsGranted` decimal(18,2) NOT NULL,
	`creditsUsed` decimal(18,2) NOT NULL DEFAULT '0.00',
	`isActive` boolean NOT NULL DEFAULT true,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `nvm_subscriptions_id` PRIMARY KEY(`id`)
);

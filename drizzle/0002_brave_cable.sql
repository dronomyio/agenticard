CREATE TABLE `agent_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerAgentId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('discover','evaluate','select','order_plan','get_token','call_agent','receive_result','settle','complete','fail') NOT NULL,
	`cardId` int,
	`agentServiceId` int,
	`cardEnhancementId` int,
	`details` text,
	`reasoning` text,
	`creditsSpent` decimal(10,2),
	`durationMs` int,
	`success` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buyer_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`strategy` enum('highest_value','lowest_cost','most_reliable','balanced') NOT NULL DEFAULT 'balanced',
	`maxCreditsPerRun` decimal(10,2) NOT NULL DEFAULT '100.00',
	`targetCategories` text,
	`credits` decimal(18,6) NOT NULL DEFAULT '500.000000',
	`totalSpent` decimal(18,6) NOT NULL DEFAULT '0.000000',
	`totalRuns` int NOT NULL DEFAULT 0,
	`successfulRuns` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buyer_agents_id` PRIMARY KEY(`id`)
);

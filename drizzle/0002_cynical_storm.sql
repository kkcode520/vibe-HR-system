CREATE TABLE `leaveQuotas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`year` int NOT NULL,
	`leaveType` enum('annual','sick','personal','maternity','paternity','bereavement','other') NOT NULL,
	`totalDays` decimal(5,1) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveQuotas_id` PRIMARY KEY(`id`)
);

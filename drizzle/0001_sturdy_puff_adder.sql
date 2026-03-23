CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeNo` varchar(32) NOT NULL,
	`name` varchar(64) NOT NULL,
	`department` varchar(64) NOT NULL,
	`position` varchar(64) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`hireDate` date NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`avatar` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employeeNo_unique` UNIQUE(`employeeNo`)
);
--> statement-breakpoint
CREATE TABLE `leaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`leaveType` enum('annual','sick','personal','maternity','paternity','bereavement','other') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`days` decimal(4,1) NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` varchar(64),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaves_id` PRIMARY KEY(`id`)
);

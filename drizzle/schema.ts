import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  decimal,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 员工信息表
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  employeeNo: varchar("employeeNo", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  department: varchar("department", { length: 64 }).notNull(),
  position: varchar("position", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  hireDate: date("hireDate").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  avatar: varchar("avatar", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * 请假记录表
 */
export const leaves = mysqlTable("leaves", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  leaveType: mysqlEnum("leaveType", [
    "annual",     // 年假
    "sick",       // 病假
    "personal",   // 事假
    "maternity",  // 产假
    "paternity",  // 陪产假
    "bereavement",// 丧假
    "other",      // 其他
  ]).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  days: decimal("days", { precision: 4, scale: 1 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", [
    "pending",   // 待审批
    "approved",  // 已批准
    "rejected",  // 已拒绝
    "cancelled", // 已取消
  ]).default("pending").notNull(),
  approvedBy: varchar("approvedBy", { length: 64 }),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = typeof leaves.$inferInsert;

/**
 * 员工假期配额表
 * 记录每位员工每年各类假期的总配额天数
 */
export const leaveQuotas = mysqlTable("leaveQuotas", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  year: int("year").notNull(),
  leaveType: mysqlEnum("leaveType", [
    "annual",
    "sick",
    "personal",
    "maternity",
    "paternity",
    "bereavement",
    "other",
  ]).notNull(),
  totalDays: decimal("totalDays", { precision: 5, scale: 1 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveQuota = typeof leaveQuotas.$inferSelect;
export type InsertLeaveQuota = typeof leaveQuotas.$inferInsert;

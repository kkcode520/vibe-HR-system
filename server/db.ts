import { eq, and, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, employees, leaves, leaveQuotas, InsertEmployee, InsertLeave } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Employee Queries ────────────────────────────────────────────────────────

export async function getAllEmployees(opts?: { department?: string; search?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(employees).$dynamic();
  const conditions = [];
  if (opts?.department) conditions.push(eq(employees.department, opts.department));
  if (opts?.status) conditions.push(eq(employees.status, opts.status as "active" | "inactive"));
  if (opts?.search) {
    conditions.push(
      or(
        like(employees.name, `%${opts.search}%`),
        like(employees.employeeNo, `%${opts.search}%`),
        like(employees.position, `%${opts.search}%`)
      )
    );
  }
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(employees.id);
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEmployeeByNo(employeeNo: string) {
  const db = await getDb();
  if (!db) return undefined;
  // 工号自动转大写，兼容 Dify 传入 emp007 / Emp007 / EMP007 均能匹配
  const normalizedNo = employeeNo.trim().toUpperCase();
  const result = await db.select().from(employees).where(eq(employees.employeeNo, normalizedNo)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(employees).values(data);
}

// ─── Leave Queries ────────────────────────────────────────────────────────────

export async function getAllLeaves(opts?: { employeeId?: number; status?: string; leaveType?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(leaves).$dynamic();
  const conditions = [];
  if (opts?.employeeId) conditions.push(eq(leaves.employeeId, opts.employeeId));
  // status 和 leaveType 自动转小写，兼容 Dify 传入大小写不一致的情况
  if (opts?.status) conditions.push(eq(leaves.status, opts.status.trim().toLowerCase() as "pending" | "approved" | "rejected" | "cancelled"));
  if (opts?.leaveType) conditions.push(eq(leaves.leaveType, opts.leaveType.trim().toLowerCase() as "annual" | "sick" | "personal" | "maternity" | "paternity" | "bereavement" | "other"));
  if (conditions.length > 0) query = query.where(and(...conditions));
  return query.orderBy(leaves.createdAt);
}

export async function getLeaveById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertLeave(data: InsertLeave) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leaves).values(data);
}

export async function updateLeaveStatus(
  id: number,
  status: "approved" | "rejected" | "cancelled",
  approvedBy?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { status };
  if (status === "approved" || status === "rejected") {
    updateData.approvedBy = approvedBy ?? null;
    updateData.approvedAt = new Date();
  }
  await db.update(leaves).set(updateData).where(eq(leaves.id, id));
}

export async function createLeave(data: InsertLeave) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leaves).values(data);
}

export async function getLeaveStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, approved: 0, rejected: 0 };
  const all = await db.select().from(leaves);
  return {
    total: all.length,
    pending: all.filter(l => l.status === "pending").length,
    approved: all.filter(l => l.status === "approved").length,
    rejected: all.filter(l => l.status === "rejected").length,
  };
}

// ─── Leave Quota Queries ─────────────────────────────────────────────────────

/**
 * 获取某员工某年的假期配额，并自动计算已使用天数和剩余天数
 * 已使用天数 = 该年内 approved 状态的请假天数之和
 */
export async function getLeaveQuotasByEmployee(employeeId: number, year: number) {
  const db = await getDb();
  if (!db) return [];

  // 获取配额
  const quotas = await db
    .select()
    .from(leaveQuotas)
    .where(and(eq(leaveQuotas.employeeId, employeeId), eq(leaveQuotas.year, year)));

  // 获取该年已批准的请假记录（用于计算已用天数）
  const approvedLeaves = await db
    .select()
    .from(leaves)
    .where(and(eq(leaves.employeeId, employeeId), eq(leaves.status, "approved")));

  // 按类型汇总已用天数（只统计该年内的请假）
  const usedMap: Record<string, number> = {};
  for (const leave of approvedLeaves) {
    const leaveYear = new Date(String(leave.startDate)).getFullYear();
    if (leaveYear === year) {
      const type = leave.leaveType;
      usedMap[type] = (usedMap[type] ?? 0) + parseFloat(String(leave.days));
    }
  }

  return quotas.map(q => {
    const total = parseFloat(String(q.totalDays));
    const used = usedMap[q.leaveType] ?? 0;
    const remaining = Math.max(0, total - used);
    return {
      id: q.id,
      employeeId: q.employeeId,
      year: q.year,
      leaveType: q.leaveType,
      totalDays: total,
      usedDays: used,
      remainingDays: remaining,
    };
  });
}

/**
 * 获取所有员工某年的配额摘要（用于列表页概览）
 */
export async function getAllEmployeeQuotaSummary(year: number) {
  const db = await getDb();
  if (!db) return [];

  const allEmployees = await db.select().from(employees);
  const allQuotas = await db
    .select()
    .from(leaveQuotas)
    .where(eq(leaveQuotas.year, year));
  const approvedLeaves = await db
    .select()
    .from(leaves)
    .where(eq(leaves.status, "approved"));

  // 按员工汇总
  return allEmployees.map(emp => {
    const empQuotas = allQuotas.filter(q => q.employeeId === emp.id);
    const empApproved = approvedLeaves.filter(l => {
      const leaveYear = new Date(String(l.startDate)).getFullYear();
      return l.employeeId === emp.id && leaveYear === year;
    });

    const usedMap: Record<string, number> = {};
    for (const leave of empApproved) {
      usedMap[leave.leaveType] = (usedMap[leave.leaveType] ?? 0) + parseFloat(String(leave.days));
    }

    const quotaDetails = empQuotas.map(q => {
      const total = parseFloat(String(q.totalDays));
      const used = usedMap[q.leaveType] ?? 0;
      return { leaveType: q.leaveType, totalDays: total, usedDays: used, remainingDays: Math.max(0, total - used) };
    });

    return {
      employeeId: emp.id,
      employeeNo: emp.employeeNo,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      quotas: quotaDetails,
    };
  });
}

export async function getEmployeeStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inactive: 0 };
  const all = await db.select().from(employees);
  return {
    total: all.length,
    active: all.filter(e => e.status === "active").length,
    inactive: all.filter(e => e.status === "inactive").length,
  };
}

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("employees router", () => {
  it("employees.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employees.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("employees.stats returns numeric counts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.employees.stats();
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.active).toBe("number");
    expect(typeof stats.inactive).toBe("number");
    expect(stats.total).toBe(stats.active + stats.inactive);
  });

  it("employees.departments returns array of strings", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const depts = await caller.employees.departments();
    expect(Array.isArray(depts)).toBe(true);
    depts.forEach(d => expect(typeof d).toBe("string"));
  });

  it("employees.byId returns null for non-existent id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.employees.byId({ id: 99999 });
    expect(result).toBeNull();
  });

  it("employees.byId returns employee with leaves for valid id", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const list = await caller.employees.list({});
    if (list.length > 0) {
      const first = list[0];
      const detail = await caller.employees.byId({ id: first.id });
      expect(detail).not.toBeNull();
      expect(detail?.id).toBe(first.id);
      expect(detail?.name).toBe(first.name);
      expect(Array.isArray(detail?.leaves)).toBe(true);
    }
  });
});

describe("leaves router", () => {
  it("leaves.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leaves.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("leaves.stats returns numeric counts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.leaves.stats();
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.pending).toBe("number");
    expect(typeof stats.approved).toBe("number");
    expect(typeof stats.rejected).toBe("number");
  });

  it("leaves.list filters by status correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const pending = await caller.leaves.list({ status: "pending" });
    pending.forEach(l => expect(l.status).toBe("pending"));
  });

  it("leaves.list filters by employeeId correctly", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const list = await caller.employees.list({});
    if (list.length > 0) {
      const empId = list[0].id;
      const leaves = await caller.leaves.list({ employeeId: empId });
      leaves.forEach(l => expect(l.employeeId).toBe(empId));
    }
  });

  it("leaves.submit creates a new pending leave record", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const employees = await caller.employees.list({});
    if (employees.length === 0) return;

    const emp = employees[0];
    const beforeCount = (await caller.leaves.list({ employeeId: emp.id })).length;

    const result = await caller.leaves.submit({
      employeeId: emp.id,
      leaveType: "personal",
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      days: 1,
      reason: "单元测试申请",
    });

    expect(result.success).toBe(true);
    const afterCount = (await caller.leaves.list({ employeeId: emp.id })).length;
    expect(afterCount).toBe(beforeCount + 1);
  });

  it("leaves.submit rejects non-existent employee", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.leaves.submit({
        employeeId: 99999,
        leaveType: "annual",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        days: 5,
      })
    ).rejects.toThrow();
  });

  it("leaves.approve changes status from pending to approved", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const pending = await caller.leaves.list({ status: "pending" });
    if (pending.length === 0) return;

    const target = pending[0];
    const result = await caller.leaves.approve({ id: target.id, approvedBy: "测试审批员" });
    expect(result.success).toBe(true);

    // 验证状态已更新
    const allLeaves = await caller.leaves.list({});
    const updated = allLeaves.find(l => l.id === target.id);
    expect(updated?.status).toBe("approved");
    expect(updated?.approvedBy).toBe("测试审批员");
  });

  it("leaves.reject changes status from pending to rejected", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const pending = await caller.leaves.list({ status: "pending" });
    if (pending.length === 0) return;

    const target = pending[0];
    const result = await caller.leaves.reject({ id: target.id, approvedBy: "测试审批员" });
    expect(result.success).toBe(true);

    const allLeaves = await caller.leaves.list({});
    const updated = allLeaves.find(l => l.id === target.id);
    expect(updated?.status).toBe("rejected");
  });

  it("leaves.approve throws for non-pending leave", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const approved = await caller.leaves.list({ status: "approved" });
    if (approved.length === 0) return;

    await expect(
      caller.leaves.approve({ id: approved[0].id })
    ).rejects.toThrow();
  });

  it("leaves.reject throws for non-existent leave", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.leaves.reject({ id: 99999 })
    ).rejects.toThrow();
  });
});

describe("leaves.quotas router", () => {
  it("returns quotas for a valid employee", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const employees = await caller.employees.list({});
    if (employees.length === 0) return;

    const emp = employees[0];
    const quotas = await caller.leaves.quotas({ employeeId: emp.id, year: 2026 });
    expect(Array.isArray(quotas)).toBe(true);
    // 应包含年假、病假、事假
    const types = quotas.map(q => q.leaveType);
    expect(types).toContain("annual");
    expect(types).toContain("sick");
    expect(types).toContain("personal");
  });

  it("each quota has totalDays, usedDays, remainingDays fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const employees = await caller.employees.list({});
    if (employees.length === 0) return;

    const quotas = await caller.leaves.quotas({ employeeId: employees[0].id, year: 2026 });
    quotas.forEach(q => {
      expect(typeof q.totalDays).toBe("number");
      expect(typeof q.usedDays).toBe("number");
      expect(typeof q.remainingDays).toBe("number");
      expect(q.remainingDays).toBe(Math.max(0, q.totalDays - q.usedDays));
    });
  });

  it("employees.quotaSummary returns all employees", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const employees = await caller.employees.list({});
    const summary = await caller.employees.quotaSummary({ year: 2026 });
    expect(summary.length).toBe(employees.length);
    summary.forEach(s => {
      expect(typeof s.employeeId).toBe("number");
      expect(typeof s.name).toBe("string");
      expect(Array.isArray(s.quotas)).toBe(true);
    });
  });

  it("usedDays increases after submitting and approving a leave", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const employees = await caller.employees.list({});
    if (employees.length === 0) return;

    const emp = employees[0];
    const beforeQuotas = await caller.leaves.quotas({ employeeId: emp.id, year: 2026 });
    const beforeAnnual = beforeQuotas.find(q => q.leaveType === "annual");

    // 提交请假申请
    await caller.leaves.submit({
      employeeId: emp.id,
      leaveType: "annual",
      startDate: "2026-09-01",
      endDate: "2026-09-02",
      days: 2,
      reason: "配额测试",
    });

    // 获取新提交的请假记录并批准
    const allLeaves = await caller.leaves.list({ employeeId: emp.id, status: "pending" });
    const newLeave = allLeaves.find(l => l.reason === "配额测试");
    if (newLeave) {
      await caller.leaves.approve({ id: newLeave.id, approvedBy: "测试审批员" });
    }

    // 验证已用天数增加
    const afterQuotas = await caller.leaves.quotas({ employeeId: emp.id, year: 2026 });
    const afterAnnual = afterQuotas.find(q => q.leaveType === "annual");
    if (beforeAnnual && afterAnnual && newLeave) {
      expect(afterAnnual.usedDays).toBe(beforeAnnual.usedDays + 2);
      expect(afterAnnual.remainingDays).toBe(beforeAnnual.remainingDays - 2);
    }
  });
});

describe("auth router", () => {
  it("auth.me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

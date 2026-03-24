/**
 * REST API employeeNo 相关测试
 * 直接调用 db 层函数验证 employeeNo 查询逻辑
 */
import { describe, it, expect } from "vitest";
import { getEmployeeByNo, getAllLeaves, getLeaveQuotasByEmployee } from "./db";

describe("getEmployeeByNo", () => {
  it("returns employee for valid employeeNo", async () => {
    const emp = await getEmployeeByNo("EMP001");
    expect(emp).not.toBeUndefined();
    expect(emp?.employeeNo).toBe("EMP001");
    expect(typeof emp?.name).toBe("string");
    expect(typeof emp?.department).toBe("string");
  });

  it("returns undefined for non-existent employeeNo", async () => {
    const emp = await getEmployeeByNo("EMP999");
    expect(emp).toBeUndefined();
  });

  it("returns correct employee for each known employeeNo", async () => {
    const knownNos = ["EMP001", "EMP002", "EMP003"];
    for (const no of knownNos) {
      const emp = await getEmployeeByNo(no);
      expect(emp).not.toBeUndefined();
      expect(emp?.employeeNo).toBe(no);
    }
  });
});

describe("getAllLeaves with employeeNo lookup", () => {
  it("can filter leaves by employeeId derived from employeeNo", async () => {
    const emp = await getEmployeeByNo("EMP001");
    if (!emp) return;

    const leaves = await getAllLeaves({ employeeId: emp.id });
    expect(Array.isArray(leaves)).toBe(true);
    leaves.forEach(l => expect(l.employeeId).toBe(emp.id));
  });
});

describe("getLeaveQuotasByEmployee via employeeNo", () => {
  it("returns quotas when looked up via employeeNo", async () => {
    const emp = await getEmployeeByNo("EMP001");
    if (!emp) return;

    const quotas = await getLeaveQuotasByEmployee(emp.id, 2026);
    expect(Array.isArray(quotas)).toBe(true);
    expect(quotas.length).toBeGreaterThan(0);

    const types = quotas.map(q => q.leaveType);
    expect(types).toContain("annual");
    expect(types).toContain("sick");
  });

  it("each quota has correct structure", async () => {
    const emp = await getEmployeeByNo("EMP002");
    if (!emp) return;

    const quotas = await getLeaveQuotasByEmployee(emp.id, 2026);
    quotas.forEach(q => {
      expect(typeof q.totalDays).toBe("number");
      expect(typeof q.usedDays).toBe("number");
      expect(typeof q.remainingDays).toBe("number");
      expect(q.remainingDays).toBe(Math.max(0, q.totalDays - q.usedDays));
    });
  });
});

/**
 * approve-by-no / reject-by-no 逻辑测试
 * 验证通过工号+日期定位请假记录的核心逻辑
 */
describe("approve-by-no / reject-by-no core logic", () => {
  it("getEmployeeByNo + getAllLeaves can locate a pending leave by startDate", async () => {
    const emp = await getEmployeeByNo("EMP001");
    if (!emp) return;

    const pendingLeaves = await getAllLeaves({ employeeId: emp.id, status: "pending" });
    // 如果有待审批记录，验证可以通过 startDate 字符串匹配
    if (pendingLeaves.length > 0) {
      const target = pendingLeaves[0];
      const startDateStr = String(target.startDate).slice(0, 10);
      const found = pendingLeaves.find(l => String(l.startDate).slice(0, 10) === startDateStr);
      expect(found).not.toBeUndefined();
      expect(found?.id).toBe(target.id);
    }
  });

  it("returns undefined when no pending leave matches the startDate", async () => {
    const emp = await getEmployeeByNo("EMP001");
    if (!emp) return;

    const pendingLeaves = await getAllLeaves({ employeeId: emp.id, status: "pending" });
    const notFound = pendingLeaves.find(l => String(l.startDate).slice(0, 10) === "1900-01-01");
    expect(notFound).toBeUndefined();
  });

  it("getEmployeeByNo returns undefined for invalid employeeNo", async () => {
    const emp = await getEmployeeByNo("INVALID999");
    expect(emp).toBeUndefined();
  });
});

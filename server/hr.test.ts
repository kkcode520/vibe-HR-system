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
});

describe("auth router", () => {
  it("auth.me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

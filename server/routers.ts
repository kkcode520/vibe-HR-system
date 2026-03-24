import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllEmployees,
  getEmployeeById,
  getAllLeaves,
  getLeaveById,
  getLeaveStats,
  getEmployeeStats,
  createLeave,
  updateLeaveStatus,
} from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Employee Procedures ────────────────────────────────────────────────────
  employees: router({
    list: publicProcedure
      .input(z.object({
        department: z.string().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllEmployees(input ?? {});
      }),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const employee = await getEmployeeById(input.id);
        if (!employee) return null;
        const leaveRecords = await getAllLeaves({ employeeId: input.id });
        return { ...employee, leaves: leaveRecords };
      }),

    stats: publicProcedure.query(async () => {
      return getEmployeeStats();
    }),

    departments: publicProcedure.query(async () => {
      const all = await getAllEmployees();
      const depts = Array.from(new Set(all.map(e => e.department)));
      return depts;
    }),
  }),

  // ─── Leave Procedures ────────────────────────────────────────────────────────
  leaves: router({
    list: publicProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        status: z.string().optional(),
        leaveType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAllLeaves(input ?? {});
      }),

    stats: publicProcedure.query(async () => {
      return getLeaveStats();
    }),

    /**
     * 提交请假申请
     * 任何人均可提交（实际生产中可改为 protectedProcedure）
     */
    submit: publicProcedure
      .input(z.object({
        employeeId: z.number().int().positive(),
        leaveType: z.enum(["annual", "sick", "personal", "maternity", "paternity", "bereavement", "other"]),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD"),
        days: z.number().positive().max(365),
        reason: z.string().max(500).optional(),
      }))
      .mutation(async ({ input }) => {
        // 验证员工存在
        const employee = await getEmployeeById(input.employeeId);
        if (!employee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "员工不存在" });
        }
        // 验证日期逻辑
        if (input.startDate > input.endDate) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "开始日期不能晚于结束日期" });
        }
        await createLeave({
          employeeId: input.employeeId,
          leaveType: input.leaveType,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          days: String(input.days),
          reason: input.reason ?? null,
          status: "pending",
        });
        return { success: true, message: "请假申请已提交，等待审批" };
      }),

    /**
     * 审批请假：批准
     */
    approve: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        approvedBy: z.string().max(64).optional(),
      }))
      .mutation(async ({ input }) => {
        const leave = await getLeaveById(input.id);
        if (!leave) {
          throw new TRPCError({ code: "NOT_FOUND", message: "请假记录不存在" });
        }
        if (leave.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `当前状态为「${leave.status}」，无法审批` });
        }
        await updateLeaveStatus(input.id, "approved", input.approvedBy ?? "管理员");
        return { success: true, message: "已批准该请假申请" };
      }),

    /**
     * 审批请假：拒绝
     */
    reject: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
        approvedBy: z.string().max(64).optional(),
      }))
      .mutation(async ({ input }) => {
        const leave = await getLeaveById(input.id);
        if (!leave) {
          throw new TRPCError({ code: "NOT_FOUND", message: "请假记录不存在" });
        }
        if (leave.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `当前状态为「${leave.status}」，无法拒绝` });
        }
        await updateLeaveStatus(input.id, "rejected", input.approvedBy ?? "管理员");
        return { success: true, message: "已拒绝该请假申请" };
      }),

    /**
     * 取消请假申请
     */
    cancel: publicProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const leave = await getLeaveById(input.id);
        if (!leave) {
          throw new TRPCError({ code: "NOT_FOUND", message: "请假记录不存在" });
        }
        if (leave.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `当前状态为「${leave.status}」，无法取消` });
        }
        await updateLeaveStatus(input.id, "cancelled");
        return { success: true, message: "请假申请已取消" };
      }),
  }),
});

export type AppRouter = typeof appRouter;

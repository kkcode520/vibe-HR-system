import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllEmployees,
  getEmployeeById,
  getAllLeaves,
  getLeaveStats,
  getEmployeeStats,
} from "./db";

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
  }),
});

export type AppRouter = typeof appRouter;

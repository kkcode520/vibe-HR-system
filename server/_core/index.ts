import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  getAllEmployees,
  getEmployeeByNo,
  getAllLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  getLeaveQuotasByEmployee,
} from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback
  registerOAuthRoutes(app);

  // ─── REST API Routes (for Dify HTTP nodes) ───────────────────────────────────

  /**
   * GET /api/employees
   * Query params: department, search, status
   */
  app.get("/api/employees", async (req, res) => {
    try {
      const { department, search, status } = req.query as Record<string, string>;
      const data = await getAllEmployees({ department, search, status });
      res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (err) {
      console.error("[REST] GET /api/employees error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * GET /api/employees/:employeeNo
   * Returns employee info + leave records (lookup by employeeNo)
   */
  app.get("/api/employees/:employeeNo/quotas", async (req, res) => {
    try {
      const { employeeNo } = req.params;
      const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
      const emp = await getEmployeeByNo(employeeNo);
      if (!emp) return res.status(404).json({ success: false, error: `员工工号 ${employeeNo} 不存在` });
      const quotas = await getLeaveQuotasByEmployee(emp.id, year);
      res.json({
        success: true,
        employeeNo: emp.employeeNo,
        employeeName: emp.name,
        year,
        data: quotas,
      });
    } catch (err) {
      console.error("[REST] GET /api/employees/:employeeNo/quotas error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.get("/api/employees/:employeeNo", async (req, res) => {
    try {
      const { employeeNo } = req.params;
      const emp = await getEmployeeByNo(employeeNo);
      if (!emp) {
        return res.status(404).json({ success: false, error: `员工工号 ${employeeNo} 不存在` });
      }
      const leaveRecords = await getAllLeaves({ employeeId: emp.id });
      res.json({
        success: true,
        data: { ...emp, leaves: leaveRecords },
      });
    } catch (err) {
      console.error("[REST] GET /api/employees/:employeeNo error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * GET /api/leaves
   * Query params: employee_no, status, leave_type
   */
  app.get("/api/leaves", async (req, res) => {
    try {
      const { employee_no, status, leave_type } = req.query as Record<string, string>;
      let employeeId: number | undefined;
      if (employee_no) {
        const emp = await getEmployeeByNo(employee_no);
        if (!emp) {
          return res.status(404).json({ success: false, error: `员工工号 ${employee_no} 不存在` });
        }
        employeeId = emp.id;
      }
      const data = await getAllLeaves({ employeeId, status, leaveType: leave_type });
      res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (err) {
      console.error("[REST] GET /api/leaves error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * POST /api/leaves
   * Body: { employeeNo, leaveType, startDate, endDate, days, reason? }
   */
  app.post("/api/leaves", async (req, res) => {
    try {
      const { employeeNo, leaveType, startDate, endDate, days, reason } = req.body;
      if (!employeeNo || !leaveType || !startDate || !endDate || !days) {
        return res.status(400).json({
          success: false,
          error: "缺少必填字段：employeeNo, leaveType, startDate, endDate, days",
        });
      }
      const emp = await getEmployeeByNo(String(employeeNo));
      if (!emp) return res.status(404).json({ success: false, error: `员工工号 ${employeeNo} 不存在` });
      if (startDate > endDate) return res.status(400).json({ success: false, error: "开始日期不能晚于结束日期" });
      await createLeave({
        employeeId: emp.id,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: String(days),
        reason: reason ?? null,
        status: "pending",
      });
      res.status(201).json({
        success: true,
        message: "请假申请已提交，等待审批",
        employeeNo: emp.employeeNo,
        employeeName: emp.name,
      });
    } catch (err) {
      console.error("[REST] POST /api/leaves error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * PATCH /api/leaves/approve?leave_id=xxx
   * Query param: leave_id
   * Body: { approvedBy? }
   * 支持 Query 参数方式指定 leave_id
   */
  app.patch("/api/leaves/approve", async (req, res) => {
    try {
      const id = parseInt(String(req.query.leave_id), 10);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "缺少或无效的 leave_id 参数" });
      const leave = await getLeaveById(id);
      if (!leave) return res.status(404).json({ success: false, error: `请假记录 ${id} 不存在` });
      if (leave.status !== "pending")
        return res.status(400).json({ success: false, error: `当前状态为「${leave.status}」，无法审批` });
      const approvedBy = req.body?.approvedBy ?? "管理员";
      await updateLeaveStatus(id, "approved", approvedBy);
      res.json({ success: true, message: `已批准请假申请 #${id}` });
    } catch (err) {
      console.error("[REST] PATCH /api/leaves/approve error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * PATCH /api/leaves/reject?leave_id=xxx
   * Query param: leave_id
   * Body: { approvedBy? }
   * 支持 Query 参数方式指定 leave_id
   */
  app.patch("/api/leaves/reject", async (req, res) => {
    try {
      const id = parseInt(String(req.query.leave_id), 10);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "缺少或无效的 leave_id 参数" });
      const leave = await getLeaveById(id);
      if (!leave) return res.status(404).json({ success: false, error: `请假记录 ${id} 不存在` });
      if (leave.status !== "pending")
        return res.status(400).json({ success: false, error: `当前状态为「${leave.status}」，无法拒绝` });
      const approvedBy = req.body?.approvedBy ?? "管理员";
      await updateLeaveStatus(id, "rejected", approvedBy);
      res.json({ success: true, message: `已拒绝请假申请 #${id}` });
    } catch (err) {
      console.error("[REST] PATCH /api/leaves/reject error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * PATCH /api/leaves/approve-by-no
   * Body: { employeeNo, startDate, approvedBy? }
   * 通过工号 + 开始日期定位待审批记录并批准，无需知道 leave_id
   */
  app.patch("/api/leaves/approve-by-no", async (req, res) => {
    try {
      const { employeeNo, startDate, approvedBy } = req.body;
      if (!employeeNo || !startDate) {
        return res.status(400).json({ success: false, error: "缺少必填字段：employeeNo, startDate" });
      }
      const emp = await getEmployeeByNo(String(employeeNo));
      if (!emp) return res.status(404).json({ success: false, error: `员工工号 ${employeeNo} 不存在` });

      // 查找该员工在指定开始日期的待审批记录
      const allLeaves = await getAllLeaves({ employeeId: emp.id, status: "pending" });
      const target = allLeaves.find(l => String(l.startDate).slice(0, 10) === String(startDate).slice(0, 10));

      if (!target) {
        return res.status(404).json({
          success: false,
          error: `未找到 ${emp.name}（${employeeNo}）在 ${startDate} 开始的待审批请假记录`,
        });
      }

      await updateLeaveStatus(target.id, "approved", approvedBy ?? "管理员");
      res.json({
        success: true,
        message: `已批准 ${emp.name}（${employeeNo}）从 ${startDate} 开始的请假申请`,
        leaveId: target.id,
        employeeName: emp.name,
        leaveType: target.leaveType,
        days: target.days,
      });
    } catch (err) {
      console.error("[REST] PATCH /api/leaves/approve-by-no error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * PATCH /api/leaves/reject-by-no
   * Body: { employeeNo, startDate, approvedBy? }
   * 通过工号 + 开始日期定位待审批记录并拒绝，无需知道 leave_id
   */
  app.patch("/api/leaves/reject-by-no", async (req, res) => {
    try {
      const { employeeNo, startDate, approvedBy } = req.body;
      if (!employeeNo || !startDate) {
        return res.status(400).json({ success: false, error: "缺少必填字段：employeeNo, startDate" });
      }
      const emp = await getEmployeeByNo(String(employeeNo));
      if (!emp) return res.status(404).json({ success: false, error: `员工工号 ${employeeNo} 不存在` });

      const allLeaves = await getAllLeaves({ employeeId: emp.id, status: "pending" });
      const target = allLeaves.find(l => String(l.startDate).slice(0, 10) === String(startDate).slice(0, 10));

      if (!target) {
        return res.status(404).json({
          success: false,
          error: `未找到 ${emp.name}（${employeeNo}）在 ${startDate} 开始的待审批请假记录`,
        });
      }

      await updateLeaveStatus(target.id, "rejected", approvedBy ?? "管理员");
      res.json({
        success: true,
        message: `已拒绝 ${emp.name}（${employeeNo}）从 ${startDate} 开始的请假申请`,
        leaveId: target.id,
        employeeName: emp.name,
        leaveType: target.leaveType,
        days: target.days,
      });
    } catch (err) {
      console.error("[REST] PATCH /api/leaves/reject-by-no error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * PATCH /api/leaves/:id/approve
   * Body: { approvedBy? }
   */
  app.patch("/api/leaves/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "无效的请假 ID" });
      const leave = await getLeaveById(id);
      if (!leave) return res.status(404).json({ success: false, error: "请假记录不存在" });
      if (leave.status !== "pending")
        return res.status(400).json({ success: false, error: `当前状态为「${leave.status}」，无法审批` });
      const approvedBy = req.body?.approvedBy ?? "管理员";
      await updateLeaveStatus(id, "approved", approvedBy);
      res.json({ success: true, message: "已批准该请假申请" });
    } catch (err) {
      console.error("[REST] PATCH /api/leaves/:id/approve error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * PATCH /api/leaves/:id/reject
   * Body: { approvedBy? }
   */
  app.patch("/api/leaves/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "无效的请假 ID" });
      const leave = await getLeaveById(id);
      if (!leave) return res.status(404).json({ success: false, error: "请假记录不存在" });
      if (leave.status !== "pending")
        return res.status(400).json({ success: false, error: `当前状态为「${leave.status}」，无法拒绝` });
      const approvedBy = req.body?.approvedBy ?? "管理员";
      await updateLeaveStatus(id, "rejected", approvedBy);
      res.json({ success: true, message: "已拒绝该请假申请" });
    } catch (err) {
      console.error("[REST] PATCH /api/leaves/:id/reject error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // ─── tRPC API ─────────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

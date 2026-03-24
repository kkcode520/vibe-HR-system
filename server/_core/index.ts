import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getAllEmployees, getEmployeeById, getAllLeaves, getLeaveById, createLeave, updateLeaveStatus, getLeaveQuotasByEmployee } from "../db";

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
   * GET /api/employees/:id
   * Returns employee info + leave records
   */
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: "Invalid employee ID" });
      }
      const employee = await getEmployeeById(id);
      if (!employee) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }
      const leaveRecords = await getAllLeaves({ employeeId: id });
      res.json({
        success: true,
        data: { ...employee, leaves: leaveRecords },
      });
    } catch (err) {
      console.error("[REST] GET /api/employees/:id error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * GET /api/leaves
   * Query params: employee_id, status, leave_type
   */
  app.get("/api/leaves", async (req, res) => {
    try {
      const { employee_id, status, leave_type } = req.query as Record<string, string>;
      const employeeId = employee_id ? parseInt(employee_id, 10) : undefined;
      const data = await getAllLeaves({
        employeeId: isNaN(employeeId as number) ? undefined : employeeId,
        status,
        leaveType: leave_type,
      });
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
   * GET /api/employees/:id/quotas
   * Query: year (optional, default current year)
   */
  app.get("/api/employees/:id/quotas", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ success: false, error: "无效的员工 ID" });
      const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
      const emp = await getEmployeeById(id);
      if (!emp) return res.status(404).json({ success: false, error: "员工不存在" });
      const quotas = await getLeaveQuotasByEmployee(id, year);
      res.json({
        success: true,
        employeeId: id,
        employeeName: emp.name,
        year,
        data: quotas,
      });
    } catch (err) {
      console.error("[REST] GET /api/employees/:id/quotas error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * POST /api/leaves
   * Body: { employeeId, leaveType, startDate, endDate, days, reason? }
   */
  app.post("/api/leaves", async (req, res) => {
    try {
      const { employeeId, leaveType, startDate, endDate, days, reason } = req.body;
      if (!employeeId || !leaveType || !startDate || !endDate || !days) {
        return res.status(400).json({ success: false, error: "缺少必填字段：employeeId, leaveType, startDate, endDate, days" });
      }
      const emp = await getEmployeeById(Number(employeeId));
      if (!emp) return res.status(404).json({ success: false, error: "员工不存在" });
      if (startDate > endDate) return res.status(400).json({ success: false, error: "开始日期不能晚于结束日期" });
      await createLeave({
        employeeId: Number(employeeId),
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: String(days),
        reason: reason ?? null,
        status: "pending",
      });
      res.status(201).json({ success: true, message: "请假申请已提交，等待审批" });
    } catch (err) {
      console.error("[REST] POST /api/leaves error:", err);
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
      if (leave.status !== "pending") return res.status(400).json({ success: false, error: `当前状态为「${leave.status}」，无法审批` });
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
      if (leave.status !== "pending") return res.status(400).json({ success: false, error: `当前状态为「${leave.status}」，无法拒绝` });
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

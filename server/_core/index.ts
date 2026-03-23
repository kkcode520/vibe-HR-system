import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getAllEmployees, getEmployeeById, getAllLeaves } from "../db";

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

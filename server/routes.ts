import type { Express } from "express";
import { createServer, type Server } from "http";
import authRouter from "./routes/auth";
import taskRouter from "./routes/tasks";
import adminRouter from "./routes/admin";
import paymentRouter from "./routes/payments";
import { handlePayPalWebhook } from "./webhooks";
import { asyncHandler } from "./middleware";
import { storage } from "./supabase-storage";
import { authenticateUser } from "./routes/common";

export async function registerRoutes(app: Express): Promise<Server> {
  // Global settings - accessible to everyone or authenticated users
  app.get("/api/settings", async (req: any, res) => {
    try {
      const settings = await storage.getSystemSettings(req.supabaseAdmin);
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "Error fetching settings" });
    }
  });

  // Notifications - User specific
  app.get("/api/notifications", authenticateUser, async (req: any, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.supabaseAdmin, req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("[NOTIFICATIONS] Failed to fetch notifications for user:", req.user?.id, error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", authenticateUser, async (req: any, res) => {
    try {
      const success = await storage.markNotificationRead(req.supabaseAdmin, req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("[NOTIFICATIONS] Failed to mark notification read:", req.params.id, error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Mount modular routes
  app.use("/api/auth", authRouter);
  app.use("/api/tasks", taskRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/payments", paymentRouter);

  // PayPal Webhooks
  app.post("/api/webhooks/paypal", asyncHandler(handlePayPalWebhook));

  const httpServer = createServer(app);
  return httpServer;
}

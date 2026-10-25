import { Router, Response } from "express";
import { authenticateUser, authenticateAdmin, notifyAdmins } from "./common";
import { storage } from "../supabase-storage";

const router = Router();

// ==========================================
// USER ENDPOINTS
// ==========================================

// Get message history for the currently logged-in user
router.get("/messages", authenticateUser, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const { data: messages, error } = await req.supabaseAdmin
      .from("support_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[SUPPORT] Failed to fetch user messages:", error);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }

    // Mark admin messages as read by the user
    await req.supabaseAdmin
      .from("support_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("sender_role", "admin")
      .eq("is_read", false);

    res.json(messages || []);
  } catch (err: any) {
    console.error("[SUPPORT] Error fetching user messages:", err);
    res.status(500).json({ message: "Server error fetching messages" });
  }
});

// Send a support message from the currently logged-in user
router.post("/messages", authenticateUser, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const { data: inserted, error } = await req.supabaseAdmin
      .from("support_messages")
      .insert({
        user_id: userId,
        sender_role: "user",
        message: message.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[SUPPORT] Failed to insert message:", error);
      return res.status(500).json({ message: "Failed to send message" });
    }

    // Notify administrators of incoming livechat request
    await notifyAdmins(
      req.supabaseAdmin,
      "New Support Inquiry",
      `${req.user.name || "A user"} submitted a new livechat message: "${message.trim().slice(0, 50)}..."`,
      "support",
      { userId, messageId: inserted.id }
    );

    res.status(201).json(inserted);
  } catch (err: any) {
    console.error("[SUPPORT] Error sending user message:", err);
    res.status(500).json({ message: "Server error sending message" });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Get all active support conversations (grouped by user)
router.get("/admin/conversations", authenticateAdmin, async (req: any, res: Response) => {
  try {
    // Fetch all support messages with associated user info
    const { data: messages, error } = await req.supabaseAdmin
      .from("support_messages")
      .select(`
        id,
        user_id,
        sender_role,
        message,
        is_read,
        created_at,
        users:user_id (id, name, email, skill_upgrade_tier)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SUPPORT ADMIN] Failed to fetch conversations:", error);
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }

    // Group messages by user_id
    const conversationMap = new Map<string, any>();

    for (const msg of (messages || [])) {
      const uid = msg.user_id;
      if (!conversationMap.has(uid)) {
        conversationMap.set(uid, {
          userId: uid,
          userName: msg.users?.name || "Anonymous User",
          userEmail: msg.users?.email || "No email",
          tier: msg.users?.skill_upgrade_tier || "member",
          lastMessage: msg.message,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
        });
      }

      if (msg.sender_role === "user" && !msg.is_read) {
        conversationMap.get(uid).unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationMap.values());
    res.json(conversations);
  } catch (err: any) {
    console.error("[SUPPORT ADMIN] Error fetching conversations:", err);
    res.status(500).json({ message: "Server error fetching conversations" });
  }
});

// Get messages for a specific user thread
router.get("/admin/messages/:userId", authenticateAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: messages, error } = await req.supabaseAdmin
      .from("support_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[SUPPORT ADMIN] Failed to fetch thread:", error);
      return res.status(500).json({ message: "Failed to fetch thread" });
    }

    // Mark user messages as read by admin
    await req.supabaseAdmin
      .from("support_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("sender_role", "user")
      .eq("is_read", false);

    res.json(messages || []);
  } catch (err: any) {
    console.error("[SUPPORT ADMIN] Error fetching thread:", err);
    res.status(500).json({ message: "Server error fetching thread" });
  }
});

// Admin replies to a user
router.post("/admin/messages/:userId", authenticateAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const { data: inserted, error } = await req.supabaseAdmin
      .from("support_messages")
      .insert({
        user_id: userId,
        sender_role: "admin",
        message: message.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[SUPPORT ADMIN] Failed to send admin reply:", error);
      return res.status(500).json({ message: "Failed to send reply" });
    }

    // Send in-app notification to the user
    await storage.createNotification(req.supabaseAdmin, {
      user_id: userId,
      title: "Support Team Replied",
      message: `Support replied: "${message.trim().slice(0, 60)}..."`,
      type: "system",
      is_read: false,
    });

    res.status(201).json(inserted);
  } catch (err: any) {
    console.error("[SUPPORT ADMIN] Error sending admin reply:", err);
    res.status(500).json({ message: "Server error sending reply" });
  }
});

export default router;

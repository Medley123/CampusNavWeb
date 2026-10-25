import { Router } from "express";
import { requireAdmin, type AdminAccount } from "../middlewares/admin-auth.js";
import { supabase } from "../lib/supabase.js";

const router = Router();
const MAX_MESSAGE_LENGTH = 4000;

type ChatMessageRow = {
  id: number;
  campus_admin_id: number;
  sender_admin_id: number | null;
  sender_role: "super_admin" | "campus_admin";
  sender_name: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

function toChatMessage(row: ChatMessageRow) {
  return {
    id: row.id,
    senderAdminId: row.sender_admin_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function parseAdminId(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getCampusAdmin(campusAdminId: number) {
  const { data, error } = await supabase.from("admin_accounts")
    .select("id, email, name, campus_name, is_active")
    .eq("id", campusAdminId)
    .eq("role", "campus_admin")
    .maybeSingle();
  if (error) throw error;
  return data;
}

function canAccessConversation(account: AdminAccount, campusAdminId: number) {
  return account.role === "super_admin" || account.id === campusAdminId;
}

router.get("/admin/chat/conversations", requireAdmin, async (req, res) => {
  const account = res.locals.adminAccount as AdminAccount;
  try {
    if (account.role === "campus_admin") {
      res.json([{
        adminId: account.id,
        adminName: account.name,
        campusName: account.campusName,
        latestMessage: null,
        latestAt: null,
        unreadCount: 0,
      }]);
      return;
    }

    const { data: admins, error: adminsError } = await supabase.from("admin_accounts")
      .select("id, name, email, campus_name, is_active")
      .eq("role", "campus_admin")
      .order("campus_name");
    if (adminsError) throw adminsError;

    const adminIds = admins.map((admin) => admin.id);
    if (adminIds.length === 0) {
      res.json([]);
      return;
    }

    const { data: messages, error: messagesError } = await supabase.from("admin_chat_messages")
      .select("campus_admin_id, sender_role, message, created_at, read_at")
      .in("campus_admin_id", adminIds)
      .order("created_at", { ascending: false });
    if (messagesError) throw messagesError;

    const latestMessages = new Map<number, { message: string; createdAt: string }>();
    const unreadCounts = new Map<number, number>();
    for (const message of messages) {
      if (!latestMessages.has(message.campus_admin_id)) {
        latestMessages.set(message.campus_admin_id, { message: message.message, createdAt: message.created_at });
      }
      if (message.sender_role === "campus_admin" && !message.read_at) {
        unreadCounts.set(message.campus_admin_id, (unreadCounts.get(message.campus_admin_id) ?? 0) + 1);
      }
    }

    res.json(admins.map((admin) => ({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      campusName: admin.campus_name,
      isActive: admin.is_active,
      latestMessage: latestMessages.get(admin.id)?.message ?? null,
      latestAt: latestMessages.get(admin.id)?.createdAt ?? null,
      unreadCount: unreadCounts.get(admin.id) ?? 0,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list admin chat conversations");
    res.status(500).json({ error: "Could not load admin conversations." });
  }
});

router.get("/admin/chat/:adminId/messages", requireAdmin, async (req, res) => {
  const account = res.locals.adminAccount as AdminAccount;
  const campusAdminId = parseAdminId(req.params.adminId);
  if (!campusAdminId || !canAccessConversation(account, campusAdminId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  try {
    const admin = await getCampusAdmin(campusAdminId);
    if (!admin) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    const { data, error } = await supabase.from("admin_chat_messages")
      .select("id, campus_admin_id, sender_admin_id, sender_role, sender_name, message, created_at, read_at")
      .eq("campus_admin_id", campusAdminId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;

    const unreadSenderRole = account.role === "super_admin" ? "campus_admin" : "super_admin";
    const unreadIds = data.filter((message) => message.sender_role === unreadSenderRole && !message.read_at).map((message) => message.id);
    const readAt = unreadIds.length > 0 ? new Date().toISOString() : null;
    if (unreadIds.length > 0) {
      const { error: readError } = await supabase.from("admin_chat_messages")
        .update({ read_at: readAt })
        .in("id", unreadIds);
      if (readError) throw readError;
    }

    res.json(data.map((message) => ({
      ...toChatMessage(message as ChatMessageRow),
      readAt: message.read_at ?? (unreadIds.includes(message.id) ? readAt : null),
    })));
  } catch (err) {
    req.log.error({ err, campusAdminId }, "Failed to load admin chat messages");
    res.status(500).json({ error: "Could not load conversation messages." });
  }
});

router.post("/admin/chat/:adminId/messages", requireAdmin, async (req, res) => {
  const account = res.locals.adminAccount as AdminAccount;
  const campusAdminId = parseAdminId(req.params.adminId);
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!campusAdminId || !canAccessConversation(account, campusAdminId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` });
    return;
  }

  try {
    const admin = await getCampusAdmin(campusAdminId);
    if (!admin || !admin.is_active) {
      res.status(404).json({ error: "This campus admin account is unavailable." });
      return;
    }

    const { data, error } = await supabase.from("admin_chat_messages").insert({
      campus_admin_id: campusAdminId,
      sender_admin_id: account.id,
      sender_role: account.role,
      sender_name: account.name,
      message,
    }).select("id, campus_admin_id, sender_admin_id, sender_role, sender_name, message, created_at, read_at").single();
    if (error) throw error;
    res.status(201).json(toChatMessage(data as ChatMessageRow));
  } catch (err) {
    req.log.error({ err, campusAdminId }, "Failed to send admin chat message");
    res.status(500).json({ error: "Could not send message." });
  }
});

router.delete("/admin/chat/:adminId/messages", requireAdmin, async (req, res) => {
  console.log("DELETE route hit", req.params.adminId, req.body);

  const account = res.locals.adminAccount as AdminAccount;
  const campusAdminId = parseAdminId(req.params.adminId);
  if (!campusAdminId || !canAccessConversation(account, campusAdminId)) {
    res.status(404).json({ error: "Conversation not found." });
    return;
  }

  const all = req.body?.all === true;
  const ids: number[] = Array.isArray(req.body?.ids)
    ? req.body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
    : [];
  if (!all && ids.length === 0) {
    res.status(400).json({ error: "Provide ids or all: true." });
    return;
  }

  try {
    let query = supabase.from("admin_chat_messages")
      .delete()
      .eq("campus_admin_id", campusAdminId);
    if (!all) query = query.in("id", ids);

    const { error } = await query;
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, campusAdminId }, "Failed to delete admin chat messages");
    res.status(500).json({ error: "Could not delete messages." });
  }
});

export default router;
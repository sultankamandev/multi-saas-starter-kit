import { Router, type Request, type Response } from "express";
import { eq, sql, desc, asc, ilike, or, count, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { db } from "../config/database.js";
import { users, adminActions, appSettings } from "../models/schema.js";
import { hashPassword, userToResponse } from "../services/auth.js";
import { v7 as uuidv7 } from "uuid";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("admin"));

function paramId(req: Request): string {
  const v = req.params.id;
  return Array.isArray(v) ? v[0] : v;
}

function paramKey(req: Request): string {
  const v = req.params.key;
  return Array.isArray(v) ? v[0] : v;
}

function paramIp(req: Request): string {
  const v = req.params.ip;
  return Array.isArray(v) ? v[0] : v;
}

const notDeleted = isNull(users.deletedAt);

router.get("/users", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const sortOrder = (req.query.sort_order as string)?.toUpperCase() === "DESC" ? "DESC" : "ASC";
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;

  const conditions = search
    ? and(
        notDeleted,
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.username, `%${search}%`)
        )
      )
    : notDeleted;

  const orderFn = sortOrder === "DESC" ? desc : asc;

  const [rows, totalResult] = await Promise.all([
    db.select().from(users).where(conditions).orderBy(orderFn(users.id)).limit(limit).offset(offset),
    db.select({ count: count() }).from(users).where(conditions),
  ]);

  res.json({
    data: rows.map(userToResponse),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  });
});

router.get("/users/:id", async (req: Request, res: Response) => {
  const id = paramId(req);
  const [user] = await db.select().from(users).where(eq(users.publicId, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  res.json(userToResponse(user));
});

const createSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(255),
  role: z.string().optional(),
  language: z.string().optional(),
  verified: z.boolean().optional(),
});

router.post("/users", async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(users)
    .values({
      publicId: uuidv7(),
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role || "user",
      language: parsed.data.language || "en",
      verified: parsed.data.verified ?? false,
    })
    .returning();

  res.status(201).json(userToResponse(user));
});

router.put("/users/:id", async (req: Request, res: Response) => {
  const id = paramId(req);
  const [existing] = await db.select().from(users).where(eq(users.publicId, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const b = req.body;
  if (b.username !== undefined) updates.username = b.username;
  if (b.first_name !== undefined) updates.firstName = b.first_name;
  if (b.last_name !== undefined) updates.lastName = b.last_name;
  if (b.email !== undefined) updates.email = b.email.toLowerCase();
  if (b.password) updates.passwordHash = await hashPassword(b.password);
  if (b.role !== undefined) updates.role = b.role;
  if (b.language !== undefined) updates.language = b.language;
  if (b.country !== undefined) updates.country = b.country;
  if (b.address !== undefined) updates.address = b.address;
  if (b.phone !== undefined) updates.phone = b.phone;
  if (b.verified !== undefined) updates.verified = b.verified;
  if (b.two_fa_enabled !== undefined) updates.twoFaEnabled = b.two_fa_enabled;

  await db.update(users).set(updates).where(eq(users.id, existing.id));
  const [updated] = await db.select().from(users).where(eq(users.id, existing.id));
  res.json(userToResponse(updated));
});

router.delete("/users/:id", async (req: Request, res: Response) => {
  const id = paramId(req);
  const [existing] = await db.select().from(users).where(eq(users.publicId, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, existing.id));
  res.json({ message: "User deleted" });
});

router.put("/users/:id/role", async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!role || !["admin", "user"].includes(role)) {
    res.status(400).json({ error: "validation_error", message: "Role must be 'admin' or 'user'" });
    return;
  }
  const id = paramId(req);
  const [existing] = await db.select().from(users).where(eq(users.publicId, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, existing.id));
  res.json({ message: `Role updated to ${role}` });
});

router.get("/user-stats", async (_req: Request, res: Response) => {
  const total = await db.select({ count: count() }).from(users).where(notDeleted);
  const verified = await db.select({ count: count() }).from(users).where(and(notDeleted, eq(users.verified, true)));
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const newUsers = await db
    .select({ count: count() })
    .from(users)
    .where(and(notDeleted, sql`${users.createdAt} >= ${sevenDaysAgo}`));

  const t = total[0]?.count ?? 0;
  const v = verified[0]?.count ?? 0;
  res.json({
    total_users: t,
    verified_users: v,
    new_users_7_days: newUsers[0]?.count ?? 0,
    verified_percent: t > 0 ? Math.round((v / t) * 10000) / 100 : 0,
  });
});

router.get("/actions", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
  const offset = (page - 1) * limit;

  const [rows, totalResult] = await Promise.all([
    db.select().from(adminActions).orderBy(desc(adminActions.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(adminActions),
  ]);

  res.json({ data: rows, total: totalResult[0]?.count ?? 0 });
});

router.get("/analytics/user-registrations", async (_req: Request, res: Response) => {
  res.json([]);
});
router.get("/analytics/active-users", async (_req: Request, res: Response) => {
  res.json({ daily: [], active_24h: 0, active_7d: 0 });
});
router.get("/analytics/retention", async (_req: Request, res: Response) => {
  res.json({ retention_data: [], average_7d: 0, average_30d: 0 });
});
router.get("/analytics/cohort", async (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/summary", async (_req: Request, res: Response) => {
  const total = await db.select({ count: count() }).from(users).where(notDeleted);
  const verified = await db.select({ count: count() }).from(users).where(and(notDeleted, eq(users.verified, true)));
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const newUsers = await db
    .select({ count: count() })
    .from(users)
    .where(and(notDeleted, sql`${users.createdAt} >= ${sevenDaysAgo}`));

  const t = total[0]?.count ?? 0;
  const v = verified[0]?.count ?? 0;
  res.json({
    total_users: t,
    verified_users: v,
    new_users_7_days: newUsers[0]?.count ?? 0,
    verified_percent: t > 0 ? Math.round((v / t) * 10000) / 100 : 0,
  });
});

router.get("/settings", async (_req: Request, res: Response) => {
  const rows = await db.select().from(appSettings);
  res.json(rows);
});

router.get("/settings/:key", async (req: Request, res: Response) => {
  const key = paramKey(req);
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found", message: "Setting not found" });
    return;
  }
  res.json(row);
});

router.put("/settings/:key", async (req: Request, res: Response) => {
  const key = paramKey(req);
  const { value } = req.body;
  const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing) {
    await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({ key, value });
  }
  const [updated] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  res.json(updated);
});

router.get("/blocked-ips", async (_req: Request, res: Response) => {
  res.json([]);
});

router.delete("/blocked-ips/:ip", async (_req: Request, res: Response) => {
  res.json({ message: "IP unblocked" });
});

export default router;

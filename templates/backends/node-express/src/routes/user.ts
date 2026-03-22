import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../config/database.js";
import { users } from "../models/schema.js";
import { findUserById, userToResponse } from "../services/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/profile", async (req: Request, res: Response) => {
  const user = await findUserById(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: "not_found", message: "User not found" });
    return;
  }
  res.json({ user: userToResponse(user) });
});

const updateSchema = z.object({
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  language: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  two_fa_enabled: z.boolean().optional(),
});

router.put("/profile", async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", errors: parsed.error.flatten().fieldErrors });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;
  if (parsed.data.first_name !== undefined) updates.firstName = parsed.data.first_name;
  if (parsed.data.last_name !== undefined) updates.lastName = parsed.data.last_name;
  if (parsed.data.language !== undefined) updates.language = parsed.data.language;
  if (parsed.data.country !== undefined) updates.country = parsed.data.country;
  if (parsed.data.address !== undefined) updates.address = parsed.data.address;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.two_fa_enabled !== undefined) updates.twoFaEnabled = parsed.data.two_fa_enabled;

  await db.update(users).set(updates).where(eq(users.id, req.auth!.userId));

  const user = await findUserById(req.auth!.userId);
  res.json({ user: user ? userToResponse(user) : null });
});

export default router;

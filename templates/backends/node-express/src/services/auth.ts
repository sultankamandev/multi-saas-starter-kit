import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v7 as uuidv7 } from "uuid";
import { eq, sql } from "drizzle-orm";
import { db } from "../config/database.js";
import { users, refreshTokens } from "../models/schema.js";
import { env } from "../config/env.js";
import type { AuthPayload } from "../middleware/auth.js";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(userId: number, publicId: string, role: string) {
  const payload: AuthPayload = { userId, publicId, role };
  const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: 900 });
  const refreshToken = jwt.sign(payload, env.jwtSecret, { expiresIn: 604800 });
  return { accessToken, refreshToken, expiresIn: 900, tokenType: "Bearer" as const };
}

export async function createUser(data: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  language?: string;
  country?: string;
}) {
  const passwordHash = await hashPassword(data.password);
  const publicId = uuidv7();

  const [user] = await db
    .insert(users)
    .values({
      publicId,
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      passwordHash,
      language: data.language || "en",
      country: data.country || "",
    })
    .returning();

  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}

export async function findUserByEmailOrUsername(identifier: string) {
  const lower = identifier.toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(
      sql`(lower(${users.email}) = ${lower} OR lower(${users.username}) = ${lower}) AND ${users.deletedAt} IS NULL`
    )
    .limit(1);
  return user ?? null;
}

export async function findUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function findUserByPublicId(publicId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.publicId, publicId))
    .limit(1);
  return user ?? null;
}

export async function storeRefreshToken(userId: number, token: string, expiresAt: Date) {
  await db.insert(refreshTokens).values({ userId, token, expiresAt });
}

export async function findAndDeleteRefreshToken(token: string) {
  const [row] = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .returning();
  return row ?? null;
}

export async function deleteAllRefreshTokens(userId: number) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export function userToResponse(user: typeof users.$inferSelect) {
  return {
    id: user.publicId,
    username: user.username ?? "",
    first_name: user.firstName ?? "",
    last_name: user.lastName ?? "",
    email: user.email,
    role: user.role,
    language: user.language ?? "en",
    country: user.country ?? "",
    address: user.address ?? "",
    phone: user.phone ?? "",
    verified: user.verified,
    two_fa_enabled: user.twoFaEnabled,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

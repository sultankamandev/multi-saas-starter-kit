import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    publicId: varchar("public_id", { length: 36 }).notNull().unique(),
    username: varchar("username", { length: 30 }).unique(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    verified: boolean("verified").notNull().default(false),
    twoFaEnabled: boolean("two_fa_enabled").notNull().default(false),
    twoFaSecret: varchar("two_fa_secret", { length: 255 }),
    language: varchar("language", { length: 5 }).default("en"),
    country: varchar("country", { length: 10 }),
    address: varchar("address", { length: 500 }),
    phone: varchar("phone", { length: 30 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    uniqueIndex("idx_users_email_lower").on(sql`lower(${t.email})`),
    uniqueIndex("idx_users_username_lower").on(sql`lower(${t.username})`),
    index("idx_users_created_at").on(t.createdAt),
  ]
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const loginEvents = pgTable(
  "login_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 500 }),
    loggedAt: timestamp("logged_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_login_events_user_logged").on(t.userId, t.loggedAt),
  ]
);

export const adminActions = pgTable(
  "admin_actions",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id"),
    adminEmail: varchar("admin_email", { length: 255 }),
    action: varchar("action", { length: 50 }).notNull(),
    targetUserId: integer("target_user_id"),
    targetEmail: varchar("target_email", { length: 255 }),
    message: text("message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_admin_actions_created").on(t.createdAt)]
);

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const recoveryCodes = pgTable("recovery_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

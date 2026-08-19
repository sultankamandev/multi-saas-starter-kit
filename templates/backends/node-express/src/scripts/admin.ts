/**
 * Promotes an existing account to the admin role.
 *
 * A fresh install has no admin: every registration gets role "user", so /admin
 * stays locked until an account is promoted by hand. Register through the app
 * first, then:
 *
 *   npm run admin -- you@example.com
 */
import { sql } from "drizzle-orm";
import { db, pool } from "../config/database.js";
import { users } from "../models/schema.js";

async function main(): Promise<number> {
  const email = (process.argv[2] ?? "").trim();
  if (!email) {
    console.error("usage: npm run admin -- <email>");
    return 2;
  }

  // Login lookups are case-insensitive everywhere else
  // (idx_users_email_lower), so match that here instead of making the operator
  // guess the stored casing.
  const [user] = await db
    .select({ email: users.email, role: users.role, verified: users.verified })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);

  if (!user) {
    console.error(`no account found for "${email}" — register through the app first`);
    return 1;
  }

  if (user.role === "admin" && user.verified) {
    console.log(`${user.email} is already an admin.`);
    return 0;
  }

  // Verified is forced alongside the role: while email verification is on, an
  // unverified admin cannot log in, which would leave the console unreachable.
  await db
    .update(users)
    .set({ role: "admin", verified: true })
    .where(sql`lower(${users.email}) = lower(${email})`);

  console.log(`Promoted ${user.email} to admin.`);
  console.log(
    'Log out and back in — the role is carried in the JWT, so an existing token still says "user".'
  );
  return 0;
}

main()
  .then(async (code) => {
    await pool.end();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });

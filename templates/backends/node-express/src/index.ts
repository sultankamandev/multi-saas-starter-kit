import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { loadLocales } from "./i18n.js";
import { autoMigrate } from "./config/migrate.js";
import { language } from "./middleware/language.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import adminRouter from "./routes/admin.js";

loadLocales();

const app = express();


app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());
app.use(language);

app.get("/ping", (_req, res) => {
  res.json({ message: "pong" });
});

app.use("/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);

// Create missing tables before accepting traffic, so a fresh database works
// with no manual step. Drizzle does not do this at runtime.
autoMigrate()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to prepare database schema:", err);
    process.exit(1);
  });

export default app;

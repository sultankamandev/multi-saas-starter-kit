import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { loadLocales } from "./i18n.js";
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

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

export default app;

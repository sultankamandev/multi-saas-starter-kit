import rateLimit from "express-rate-limit";
import { t } from "../i18n.js";

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "rate_limited",
      message: t(req.lang ?? "en", "RateLimitExceeded"),
    });
  },
});

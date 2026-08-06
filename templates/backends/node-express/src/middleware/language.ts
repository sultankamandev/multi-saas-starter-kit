import type { Request, Response, NextFunction } from "express";
import { DEFAULT_LANGUAGE, isLanguageSupported } from "../i18n.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      lang: string;
    }
  }
}

/**
 * Resolves the response language from the standard Accept-Language header.
 * A custom header would trigger a CORS preflight, which the frontends avoid.
 */
export function language(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers["accept-language"];
  req.lang = DEFAULT_LANGUAGE;

  if (typeof header === "string" && header.length > 0) {
    // "tr-TR,tr;q=0.9,en;q=0.8" -> first supported 2-letter tag
    const tags = header
      .split(",")
      .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
      .filter(Boolean);

    for (const tag of tags) {
      if (isLanguageSupported(tag)) {
        req.lang = tag;
        break;
      }
    }
  }
  next();
}

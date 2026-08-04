import type { NextFunction, Request, Response } from "express";
import { verifySession } from "../lib/jwt.js";

export interface AuthedUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.aether_session;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = verifySession(token);
    req.user = { id: payload.sub, email: payload.email, first_name: payload.first_name, last_name: payload.last_name };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

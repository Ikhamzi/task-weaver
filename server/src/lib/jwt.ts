import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface SessionPayload {
  sub: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "30d" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.jwtSecret) as SessionPayload;
}

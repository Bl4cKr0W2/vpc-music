import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: { message: "Invalid token" } });
  }
}

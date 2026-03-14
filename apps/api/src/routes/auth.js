import { Router } from "express";

export const authRoutes = Router();

// POST /api/auth/register
authRoutes.post("/register", async (req, res, next) => {
  try {
    // TODO: implement registration
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
authRoutes.post("/login", async (req, res, next) => {
  try {
    // TODO: implement login
    res.status(501).json({ message: "Not implemented" });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
authRoutes.post("/logout", (_req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

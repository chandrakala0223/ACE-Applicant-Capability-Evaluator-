import { Router } from "express";
import { User } from "../models/User";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    console.log(`[DEBUG AUTH] User Found: ${!!user}`);
    if (!user) {
      console.log(`[DEBUG AUTH] Login Failed: User not found for email ${email.toLowerCase()}`);
      res.status(401).json({ error: "Invalid Email or Password" });
      return;
    }

    console.log(`[DEBUG AUTH] Role: ${user.role}`);
    console.log(`[DEBUG AUTH] Hashed Password in DB: ${user.password}`);

    const valid = await user.comparePassword(password);
    console.log(`[DEBUG AUTH] Password Match: ${valid}`);
    if (!valid) {
      console.log(`[DEBUG AUTH] Login Failed: Password mismatch for ${email.toLowerCase()}`);
      res.status(401).json({ error: "Invalid Email or Password" });
      return;
    }

    if (user.role !== "recruiter" && user.role !== "admin") {
      res.status(403).json({ error: "Access Denied. Recruiter Account Required." });
      return;
    }

    const token = signToken({ userId: String(user._id), email: user.email, role: user.role });
    console.log(`[DEBUG AUTH] JWT Generated successfully for ${user.email}`);
    res.json({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[DEBUG AUTH] Login error:`, err);
    res.status(500).json({ error: `Login failed: ${message}` });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user!.userId).select("-password");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;

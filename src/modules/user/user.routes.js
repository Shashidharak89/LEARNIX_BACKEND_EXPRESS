import { Router } from "express";
import { getMe, verifyUser } from "./user.controller.js";
import {
  getUserUpdates,
  updateUpdateById,
  deleteUpdateById,
} from "../updates/authorized/authorized-updates.controller.js";
import { authenticate } from "../../common/middleware/authenticate.js";

const router = Router();

// User verification endpoints
// GET /api/user/verify, POST /api/user/verify
router.get("/verify", verifyUser);
router.post("/verify", verifyUser);

// Current user profile endpoints
// GET /api/user/me, POST /api/user/me
router.get("/me", authenticate, getMe);
router.post("/me", authenticate, getMe);

// Alias: GET /api/user/profile
router.get("/profile", authenticate, getMe);

// Authenticated user updates endpoints
// GET /api/user/updates, GET /api/user/updates/getupdates
router.get("/updates", authenticate, getUserUpdates);
router.get("/updates/getupdates", authenticate, getUserUpdates);

// UPDATE & DELETE user update endpoints
// PUT/PATCH /api/user/updates/:id, DELETE /api/user/updates/:id
router.put("/updates/:id", authenticate, updateUpdateById);
router.patch("/updates/:id", authenticate, updateUpdateById);
router.delete("/updates/:id", authenticate, deleteUpdateById);

export default router;




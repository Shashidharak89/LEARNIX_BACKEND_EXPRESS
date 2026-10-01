import { Router } from "express";
import { authenticate } from "../../../common/middleware/authenticate.js";
import { getUserUpdates } from "./authorized-updates.controller.js";

const router = Router();

// Protect all authorized update endpoints with JWT authentication middleware
router.use(authenticate);

// GET /api/updates/user
// GET /api/updates/user/getupdates
// GET /api/updates/user/recent
router.get("/", getUserUpdates);
router.get("/getupdates", getUserUpdates);
router.get("/recent", getUserUpdates);

export default router;

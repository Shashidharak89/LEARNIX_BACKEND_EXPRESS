import { Router } from "express";
import { authenticate } from "../../../common/middleware/authenticate.js";
import { uploadFilesMiddleware } from "../../../common/middleware/upload.js";
import {
  createUpdateDirect,
  getUserUpdates,
  updateUpdateById,
  deleteUpdateById,
} from "./authorized-updates.controller.js";

const router = Router();

// Protect all authorized update endpoints with JWT authentication middleware
router.use(authenticate);

// CREATE update directly with multiple file uploads (multipart/form-data)
// POST /api/updates/user
// POST /api/updates/user/create
// POST /api/updates/user/upload
router.post("/", uploadFilesMiddleware, createUpdateDirect);
router.post("/create", uploadFilesMiddleware, createUpdateDirect);
router.post("/upload", uploadFilesMiddleware, createUpdateDirect);

// GET /api/updates/user
// GET /api/updates/user/getupdates
// GET /api/updates/user/recent
router.get("/", getUserUpdates);
router.get("/getupdates", getUserUpdates);
router.get("/recent", getUserUpdates);

// UPDATE update by ID
// PUT /api/updates/user/:id, PATCH /api/updates/user/:id
// PUT /api/updates/user/update/:id
router.put("/:id", updateUpdateById);
router.patch("/:id", updateUpdateById);
router.put("/update/:id", updateUpdateById);

// DELETE update by ID
// DELETE /api/updates/user/:id
// DELETE /api/updates/user/delete/:id
// DELETE /api/updates/user/deleteupdate/:id
router.delete("/:id", deleteUpdateById);
router.delete("/delete/:id", deleteUpdateById);
router.delete("/deleteupdate/:id", deleteUpdateById);

export default router;


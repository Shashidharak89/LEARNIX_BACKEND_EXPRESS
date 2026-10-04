import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { LegacyMaterialsService } from "./legacy-materials.service.js";

/**
 * GET /api/study-materials
 */
export const getLegacyStudyMaterials = asyncHandler(async (req, res) => {
  const data = LegacyMaterialsService.getDecodedMaterials();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(200).json(data);
});

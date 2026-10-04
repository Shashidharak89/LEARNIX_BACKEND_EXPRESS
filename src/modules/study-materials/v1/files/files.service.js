import SMFiles from "../../../../models/study-materials/SMFiles.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class SMFilesService {
  static async getAllFiles({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMFiles.find({})
        .populate({
          path: "sub",
          populate: [
            { path: "course" },
            { path: "sem" },
            { path: "batch" },
            { path: "college", populate: { path: "university" } },
          ],
        })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(l)
        .lean(),
      SMFiles.countDocuments({}),
    ]);

    return {
      success: true,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
      data: records,
    };
  }

  static async getFilesBySubject({ subjectId, page = 1, limit = 20 }) {
    if (!subjectId) {
      throw new ApiError(400, "subjectId query parameter is required");
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const query = { sub: subjectId };

    const [records, total] = await Promise.all([
      SMFiles.find(query).sort({ createdAt: 1 }).skip(skip).limit(l).lean(),
      SMFiles.countDocuments(query),
    ]);

    return {
      success: true,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
      data: records,
    };
  }
}

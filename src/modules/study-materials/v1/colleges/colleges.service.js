import SMCollege from "../../../../models/study-materials/SMCollege.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class SMCollegesService {
  static async getAllColleges({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMCollege.find({})
        .populate("university")
        .sort({ name: 1 })
        .skip(skip)
        .limit(l)
        .lean(),
      SMCollege.countDocuments({}),
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

  static async getCollegesByUniversity({ universityId, page = 1, limit = 20 }) {
    if (!universityId) {
      throw new ApiError(400, "universityId query parameter is required");
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const query = { university: universityId };

    const [records, total] = await Promise.all([
      SMCollege.find(query).sort({ name: 1 }).skip(skip).limit(l).lean(),
      SMCollege.countDocuments(query),
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

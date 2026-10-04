import SMSubject from "../../../../models/study-materials/SMSubject.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class SMSubjectsService {
  static async getAllSubjects({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMSubject.find({})
        .populate("college")
        .populate("course")
        .populate("sem")
        .populate("batch")
        .sort({ name: 1 })
        .skip(skip)
        .limit(l)
        .lean(),
      SMSubject.countDocuments({}),
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

  static async getSubjectsByBatch({
    batchId,
    semesterId = null,
    courseId = null,
    collegeId = null,
    page = 1,
    limit = 20,
  }) {
    if (!batchId) {
      throw new ApiError(400, "batchId query parameter is required");
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const query = { batch: batchId };
    if (collegeId) query.college = collegeId;
    if (courseId) query.course = courseId;
    if (semesterId) query.sem = semesterId;

    const [records, total] = await Promise.all([
      SMSubject.find(query).sort({ createdAt: 1 }).skip(skip).limit(l).lean(),
      SMSubject.countDocuments(query),
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

import SMBatch from "../../../../models/study-materials/SMBatch.js";
import SMSubject from "../../../../models/study-materials/SMSubject.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class SMBatchesService {
  static async getAllBatches({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMBatch.find({}).sort({ startyear: 1 }).skip(skip).limit(l).lean(),
      SMBatch.countDocuments({}),
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

  static async getBatchesBySemester({
    semesterId,
    courseId = null,
    collegeId = null,
    page = 1,
    limit = 20,
  }) {
    if (!semesterId) {
      throw new ApiError(400, "semesterId query parameter is required");
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const subjectQuery = { sem: semesterId };
    if (collegeId) {
      subjectQuery.college = collegeId;
    }
    if (courseId) {
      subjectQuery.course = courseId;
    }

    const subjects = await SMSubject.find(subjectQuery).select("batch").lean();
    const batchIds = [
      ...new Set(subjects.map((s) => s.batch?.toString()).filter(Boolean)),
    ];

    const query = { _id: { $in: batchIds } };

    const [records, total] = await Promise.all([
      SMBatch.find(query).sort({ startyear: 1 }).skip(skip).limit(l).lean(),
      SMBatch.countDocuments(query),
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

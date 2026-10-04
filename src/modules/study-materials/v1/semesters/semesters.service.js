import SMSemester from "../../../../models/study-materials/SMSemester.js";
import SMSubject from "../../../../models/study-materials/SMSubject.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class SMSemestersService {
  static async getAllSemesters({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMSemester.find({}).sort({ sem: 1 }).skip(skip).limit(l).lean(),
      SMSemester.countDocuments({}),
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

  static async getSemestersByCourse({
    courseId,
    collegeId = null,
    page = 1,
    limit = 20,
  }) {
    if (!courseId) {
      throw new ApiError(400, "courseId query parameter is required");
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const subjectQuery = { course: courseId };
    if (collegeId) {
      subjectQuery.college = collegeId;
    }

    const subjects = await SMSubject.find(subjectQuery).select("sem").lean();
    const semesterIds = [
      ...new Set(subjects.map((s) => s.sem?.toString()).filter(Boolean)),
    ];

    const query = { _id: { $in: semesterIds } };

    const [records, total] = await Promise.all([
      SMSemester.find(query).sort({ sem: 1 }).skip(skip).limit(l).lean(),
      SMSemester.countDocuments(query),
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

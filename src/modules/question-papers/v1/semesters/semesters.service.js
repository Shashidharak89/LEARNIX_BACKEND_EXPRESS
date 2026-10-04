import QPSemesters from "../../../../models/question-papers/QPSemesters.js";
import QPSubjects from "../../../../models/question-papers/QPSubjects.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class QPSemestersService {
  static async getSemesters({ collegeId, courseId, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;

    let query = {};

    if (collegeId && courseId) {
      const subjects = await QPSubjects.find({
        college: collegeId,
        course: courseId,
      })
        .select("semester")
        .lean();
      const semesterIds = [
        ...new Set(subjects.map((s) => s.semester?.toString()).filter(Boolean)),
      ];
      query = { _id: { $in: semesterIds } };
    }

    const [records, total] = await Promise.all([
      QPSemesters.find(query)
        .sort({ semesterNumber: 1 })
        .skip(skip)
        .limit(l)
        .lean(),
      QPSemesters.countDocuments(query),
    ]);

    return {
      success: true,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
      },
      data: records,
    };
  }

  static async getSemestersByCourse({ collegeId, courseId, page = 1, limit = 20 }) {
    if (!collegeId || !courseId) {
      throw new ApiError(400, "collegeId and courseId query parameters are required");
    }
    return this.getSemesters({ collegeId, courseId, page, limit });
  }
}

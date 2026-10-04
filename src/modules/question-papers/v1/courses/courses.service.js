import QPCourse from "../../../../models/question-papers/QPCourse.js";
import QPSubjects from "../../../../models/question-papers/QPSubjects.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class QPCoursesService {
  static async getCourses({ collegeId, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;

    let query = {};

    if (collegeId) {
      const subjects = await QPSubjects.find({ college: collegeId })
        .select("course")
        .lean();
      const courseIds = [
        ...new Set(subjects.map((s) => s.course?.toString()).filter(Boolean)),
      ];
      query = { _id: { $in: courseIds } };
    }

    const [records, total] = await Promise.all([
      QPCourse.find(query).sort({ name: 1 }).skip(skip).limit(l).lean(),
      QPCourse.countDocuments(query),
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

  static async getCoursesByCollege({ collegeId, page = 1, limit = 20 }) {
    if (!collegeId) {
      throw new ApiError(400, "collegeId query parameter is required");
    }
    return this.getCourses({ collegeId, page, limit });
  }
}

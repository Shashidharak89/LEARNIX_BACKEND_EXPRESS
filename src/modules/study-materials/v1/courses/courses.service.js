import SMCourse from "../../../../models/study-materials/SMCourse.js";
import SMSubject from "../../../../models/study-materials/SMSubject.js";
import { ApiError } from "../../../../common/utils/apiError.js";

export class SMCoursesService {
  static async getAllCourses({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMCourse.find({}).sort({ name: 1 }).skip(skip).limit(l).lean(),
      SMCourse.countDocuments({}),
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

  static async getCoursesByCollege({ collegeId, page = 1, limit = 20 }) {
    if (!collegeId) {
      throw new ApiError(400, "collegeId query parameter is required");
    }

    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const subjects = await SMSubject.find({ college: collegeId })
      .select("course")
      .lean();
    const courseIds = [
      ...new Set(subjects.map((s) => s.course?.toString()).filter(Boolean)),
    ];

    const query = { _id: { $in: courseIds } };

    const [records, total] = await Promise.all([
      SMCourse.find(query).sort({ name: 1 }).skip(skip).limit(l).lean(),
      SMCourse.countDocuments(query),
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

import QPImages from "../../../../models/question-papers/QPImages.js";
import QPSubjects from "../../../../models/question-papers/QPSubjects.js";

export class QPImagesService {
  static async getImages({
    subjectId,
    collegeId,
    batchId,
    examTypeId,
    courseId,
    semesterId,
    page = 1,
    limit = 20,
  }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;

    const query = {};
    if (subjectId) query.subject = subjectId;
    if (collegeId) query.college = collegeId;
    if (batchId) query.batch = batchId;
    if (examTypeId) query.examtype = examTypeId;

    if (!subjectId && (courseId || semesterId)) {
      const subjectQuery = {};
      if (collegeId) subjectQuery.college = collegeId;
      if (courseId) subjectQuery.course = courseId;
      if (semesterId) subjectQuery.semester = semesterId;

      const validSubjects = await QPSubjects.find(subjectQuery)
        .select("_id")
        .lean();
      const validSubjectIds = validSubjects.map((s) => s._id);
      query.subject = { $in: validSubjectIds };
    }

    const [records, total] = await Promise.all([
      QPImages.find(query)
        .populate("subject")
        .populate("batch")
        .populate("examtype")
        .populate("college")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean(),
      QPImages.countDocuments(query),
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
}

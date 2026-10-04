import QPColleges from "../../../../models/question-papers/QPColleges.js";

export class QPCollegesService {
  static async getColleges({ universityId, page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;

    const query = universityId ? { university: universityId } : {};

    const [records, total] = await Promise.all([
      QPColleges.find(query).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
      QPColleges.countDocuments(query),
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

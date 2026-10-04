import QPUniversities from "../../../../models/question-papers/QPUniversities.js";

export class QPUniversitiesService {
  static async getUniversities({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      QPUniversities.find({}).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
      QPUniversities.countDocuments({}),
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

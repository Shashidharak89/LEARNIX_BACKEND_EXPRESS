import SMUniversity from "../../../../models/study-materials/SMUniversity.js";

export class SMUniversitiesService {
  static async getUniversities({ page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const [records, total] = await Promise.all([
      SMUniversity.find({}).sort({ name: 1 }).skip(skip).limit(l).lean(),
      SMUniversity.countDocuments({}),
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

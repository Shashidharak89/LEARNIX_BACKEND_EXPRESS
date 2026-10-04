import QPSubjects from "../../../../models/question-papers/QPSubjects.js";

function escapeRegex(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanKeyword(text = "") {
  if (!text || typeof text !== "string") return "";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();
  if (cleaned === "null" || cleaned === "undefined") return "";
  return cleaned;
}

export class QPSubjectsService {
  /**
   * Fetches paginated subjects, supporting optional keyword search in the same API.
   * Default: page=1&size=20&keyword=""
   */
  static async getSubjects({ page = 1, size = 20, limit = 20, keyword = "", q = "", search = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(size ?? limit, 10) || 20));
    const skip = (pageNum - 1) * pageSize;

    const searchTerm = cleanKeyword(keyword || q || search);

    if (searchTerm) {
      const cleanQuery = searchTerm.toLowerCase();
      const words = cleanQuery.split(/\s+/).filter(Boolean);

      let query = {};
      if (words.length > 0) {
        query = {
          $or: words.map((w) => ({
            name: { $regex: escapeRegex(w), $options: "i" },
          })),
        };
      }

      const allRecords = await QPSubjects.find(query).lean();

      let scoredRecords = allRecords;
      if (words.length > 0) {
        scoredRecords = allRecords
          .map((r) => {
            let score = 0;
            const text = (r.name || "").toLowerCase();
            if (text.includes(cleanQuery)) score += 20;
            if (text.startsWith(cleanQuery)) score += 10;
            for (const word of words) {
              if (text.includes(word)) {
                score += 5;
              }
            }
            return { r, score };
          })
          .filter((item) => item.score > 0)
          .sort(
            (a, b) =>
              b.score - a.score ||
              new Date(b.r.createdAt || 0) - new Date(a.r.createdAt || 0)
          )
          .map((item) => item.r);
      } else {
        scoredRecords.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
      }

      const total = scoredRecords.length;
      const records = scoredRecords.slice(skip, skip + pageSize);

      return {
        success: true,
        pagination: {
          total,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
        data: records,
      };
    }

    // Default query without keyword (returns first 20 or requested page)
    const [records, total] = await Promise.all([
      QPSubjects.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      QPSubjects.countDocuments({}),
    ]);

    return {
      success: true,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
      data: records,
    };
  }
}

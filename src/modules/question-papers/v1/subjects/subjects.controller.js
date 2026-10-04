import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { QPSubjectsService } from "./subjects.service.js";

/**
 * Controller to fetch paginated QP subjects.
 * Initial load: GET /api/qp/v1/subjects?page=1&size=20&keyword=""
 * Search query: GET /api/qp/v1/subjects?page=1&size=20&keyword="math"
 */
export const getSubjects = asyncHandler(async (req, res) => {
  const { page, size, limit, keyword, q, query, search } = req.query;

  const result = await QPSubjectsService.getSubjects({
    page,
    size: size ?? limit,
    limit: limit ?? size,
    keyword: keyword ?? q ?? query ?? search ?? "",
  });

  return res.status(200).json(result);
});

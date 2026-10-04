import { asyncHandler } from "../../../../common/utils/asyncHandler.js";
import { SMSearchService } from "./search.service.js";

/**
 * GET /api/sm/v1/search/all
 */
export const searchAll = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchAll({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/universities
 */
export const searchUniversities = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchUniversities({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/colleges
 */
export const searchColleges = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchColleges({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/courses
 */
export const searchCourses = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchCourses({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/semesters
 */
export const searchSemesters = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchSemesters({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/batches
 */
export const searchBatches = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchBatches({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/subjects
 */
export const searchSubjects = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchSubjects({ q, page, limit });
  return res.status(200).json(result);
});

/**
 * GET /api/sm/v1/search/tree
 */
export const searchTree = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await SMSearchService.searchTree({ q, page, limit });
  return res.status(200).json(result);
});

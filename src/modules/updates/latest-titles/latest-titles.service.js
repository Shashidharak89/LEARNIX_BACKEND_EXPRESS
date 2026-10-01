import Update from "../../../models/updates/Update.js";
import { CacheService } from "../../../common/services/cache.service.js";

const CACHE_KEY = "updates:latest_3_titles";
// 30 minutes in seconds (30 * 60)
const CACHE_TTL_SECONDS = 30 * 60;

export class LatestTitlesService {
  /**
   * Fetch the last 3 public update titles, cached in Redis for 30 minutes.
   */
  static async getLatest3Titles() {
    // 1. Try to fetch from Redis cache
    const cachedData = await CacheService.get(CACHE_KEY);
    if (cachedData) {
      return {
        ...cachedData,
        source: "cache",
      };
    }

    // 2. Fetch from MongoDB if cache miss
    const latestUpdates = await Update.find(
      {
        $or: [{ visibility: "public" }, { visibility: { $exists: false } }],
      },
      { title: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const result = {
      titles: latestUpdates.map((u) => u.title),
      updates: latestUpdates.map((u) => ({
        _id: u._id,
        title: u.title,
        createdAt: u.createdAt,
      })),
      cachedDurationMinutes: 30,
    };

    // 3. Store in Redis cache for 30 minutes (1800s)
    await CacheService.set(CACHE_KEY, result, CACHE_TTL_SECONDS);

    return {
      ...result,
      source: "database",
    };
  }
}

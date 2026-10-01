import mongoose from "mongoose";
import Topic from "../../models/Topic.js";
import Subject from "../../models/Subject.js";
import User from "../../models/User.js";
import { ApiError } from "../../common/utils/apiError.js";

function escapeRegex(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class ResourceService {
  /**
   * Fetch public resources (works) with pagination, latest sorting, and optional keyword search.
   * Limits returned images to a maximum of 2.
   */
  static async getResources({ page = 1, size = 10, keyword = "" }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    // Cap max pagination size to 100 records
    const limit = Math.min(100, Math.max(1, parseInt(size, 10) || 10));
    const skip = (pageNum - 1) * limit;

    // Public visibility conditions
    const visibilityCondition = {
      $or: [
        { visibility: "public" },
        { visibility: { $exists: false } },
        { public: true },
      ],
    };

    let filter = visibilityCondition;

    const trimmedKeyword = (keyword || "").trim();
    if (trimmedKeyword) {
      const regex = new RegExp(escapeRegex(trimmedKeyword), "i");

      // Find matching subjects
      const matchedSubjects = await Subject.find(
        { subject: regex },
        { _id: 1 }
      ).lean();
      const matchedSubjectIds = matchedSubjects.map((s) => s._id);

      // Find matching users (name or USN)
      const matchedUsers = await User.find(
        { $or: [{ name: regex }, { usn: regex }] },
        { _id: 1 }
      ).lean();
      const matchedUserIds = matchedUsers.map((u) => u._id);

      const searchConditions = [
        { topic: regex },
        { content: regex },
      ];

      if (matchedSubjectIds.length > 0) {
        searchConditions.push({ subjectId: { $in: matchedSubjectIds } });
      }

      if (matchedUserIds.length > 0) {
        searchConditions.push({ userId: { $in: matchedUserIds } });
      }

      filter = {
        $and: [visibilityCondition, { $or: searchConditions }],
      };
    }

    const [total, topics] = await Promise.all([
      Topic.countDocuments(filter),
      Topic.find(filter)
        .sort({ timestamp: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Batch fetch associated Subjects and Users
    const subjectIds = topics.map((t) => t.subjectId).filter(Boolean);
    const userIds = topics.map((t) => t.userId).filter(Boolean);

    const [subjects, users] = await Promise.all([
      Subject.find({ _id: { $in: subjectIds } }, { subject: 1, userId: 1 }).lean(),
      User.find({ _id: { $in: userIds } }, { name: 1, usn: 1, profileimg: 1 }).lean(),
    ]);

    const subjectMap = new Map();
    subjects.forEach((s) => subjectMap.set(s._id.toString(), s));

    const userMap = new Map();
    users.forEach((u) => userMap.set(u._id.toString(), u));

    // Enrich resource documents with subject and user details, and slice images to max 2
    const enrichedResources = topics.map((item) => {
      const subject = item.subjectId ? subjectMap.get(item.subjectId.toString()) : null;
      // Fallback: If user is not directly on topic, check subject's userId
      const effectiveUserId = item.userId || subject?.userId;
      const user = effectiveUserId ? userMap.get(effectiveUserId.toString()) : null;

      // Restrict images to max 2 items
      const rawImages = Array.isArray(item.images) ? item.images : [];
      const slicedImages = rawImages.slice(0, 2);

      return {
        _id: item._id,
        topic: item.topic,
        content: item.content || "",
        images: slicedImages,
        totalImages: rawImages.length,
        downloadlink: item.downloadlink || "",
        visibility: item.visibility || "public",
        timestamp: item.timestamp,
        subjectId: item.subjectId || null,
        subject: subject ? subject.subject : null,
        userId: effectiveUserId || null,
        author: {
          name: user?.name || null,
          usn: user?.usn || null,
          profileimg: user?.profileimg || null,
        },
      };
    });

    return {
      resources: enrichedResources,
      pagination: {
        total,
        page: pageNum,
        size: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetch a single resource by ID with full details (and images capped at 2 for preview if needed, or all).
   */
  static async getResourceById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid resource ID");
    }

    const topic = await Topic.findById(id).lean();

    if (!topic) {
      throw new ApiError(404, "Resource not found");
    }

    const isAllowed =
      topic.visibility === "public" ||
      topic.visibility === "unlisted" ||
      topic.public === true ||
      !topic.visibility;

    if (!isAllowed) {
      throw new ApiError(404, "Resource not found or is private");
    }

    const [subject, user] = await Promise.all([
      topic.subjectId ? Subject.findById(topic.subjectId, { subject: 1, userId: 1 }).lean() : null,
      topic.userId ? User.findById(topic.userId, { name: 1, usn: 1, profileimg: 1 }).lean() : null,
    ]);

    const rawImages = Array.isArray(topic.images) ? topic.images : [];

    return {
      _id: topic._id,
      topic: topic.topic,
      content: topic.content || "",
      images: rawImages.slice(0, 2),
      totalImages: rawImages.length,
      downloadlink: topic.downloadlink || "",
      visibility: topic.visibility || "public",
      timestamp: topic.timestamp,
      subjectId: topic.subjectId || null,
      subject: subject ? subject.subject : null,
      userId: topic.userId || subject?.userId || null,
      author: {
        name: user?.name || null,
        usn: user?.usn || null,
        profileimg: user?.profileimg || null,
      },
    };
  }
}

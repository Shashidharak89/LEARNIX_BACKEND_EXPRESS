import SMUniversity from "../../../models/study-materials/SMUniversity.js";
import SMCollege from "../../../models/study-materials/SMCollege.js";
import SMCourse from "../../../models/study-materials/SMCourse.js";
import SMSemester from "../../../models/study-materials/SMSemester.js";
import SMBatch from "../../../models/study-materials/SMBatch.js";
import SMSubject from "../../../models/study-materials/SMSubject.js";
import SMFiles from "../../../models/study-materials/SMFiles.js";
import { ApiError } from "../../../common/utils/apiError.js";

export class SMTreeService {
  /**
   * Builds the static nested tree structure:
   * University -> College -> Course -> Semester -> Batch -> Subject
   */
  static async getFullTree() {
    const smFiles = await SMFiles.find()
      .populate({
        path: "sub",
        populate: [
          { path: "course", model: "SMCourse" },
          { path: "sem", model: "SMSemester" },
          { path: "batch", model: "SMBatch" },
          {
            path: "college",
            model: "SMCollege",
            populate: { path: "university", model: "SMUniversity" },
          },
        ],
      })
      .lean();

    const tree = {};

    for (const file of smFiles) {
      if (
        !file.sub ||
        !file.sub.college ||
        !file.sub.college.university ||
        !file.sub.course ||
        !file.sub.sem ||
        !file.sub.batch
      ) {
        continue;
      }

      const uniName = file.sub.college.university.name;
      const collName = file.sub.college.name;
      const courseName = file.sub.course.name;
      const semName = `Semester ${file.sub.sem.sem}`;
      const batchName = `${file.sub.batch.startyear}-${file.sub.batch.endyear}`;

      if (!tree[uniName]) tree[uniName] = {};
      if (!tree[uniName][collName]) tree[uniName][collName] = {};
      if (!tree[uniName][collName][courseName]) tree[uniName][collName][courseName] = {};
      if (!tree[uniName][collName][courseName][semName]) tree[uniName][collName][courseName][semName] = {};
      if (!tree[uniName][collName][courseName][semName][batchName]) tree[uniName][collName][courseName][semName][batchName] = {};

      if (!tree[uniName][collName][courseName][semName][batchName][file.sub.name]) {
        tree[uniName][collName][courseName][semName][batchName][file.sub.name] = {
          isLeaf: true,
          collegeId: file.sub.college._id,
          courseId: file.sub.course._id,
          semesterId: file.sub.sem._id,
          batchId: file.sub.batch._id,
          subjectId: file.sub._id,
        };
      }
    }

    return { success: true, tree };
  }

  /**
   * Dynamic level-based loader for lazy tree navigation
   */
  static async getDynamicTree({
    level,
    universityId,
    collegeId,
    courseId,
    semesterId,
    batchId,
    subjectId,
  }) {
    if (level === "universities") {
      const data = await SMUniversity.find({}).sort({ name: 1 }).lean();
      return { success: true, data };
    }

    if (level === "colleges") {
      const data = await SMCollege.find({ university: universityId })
        .sort({ name: 1 })
        .lean();
      return { success: true, data };
    }

    if (level === "courses") {
      const subjects = await SMSubject.find({ college: collegeId })
        .select("course")
        .lean();
      const courseIds = [...new Set(subjects.map((s) => s.course?.toString()).filter(Boolean))];
      const data = await SMCourse.find({ _id: { $in: courseIds } })
        .sort({ name: 1 })
        .lean();
      return { success: true, data };
    }

    if (level === "semesters") {
      const subjects = await SMSubject.find({
        college: collegeId,
        course: courseId,
      })
        .select("sem")
        .lean();
      const semIds = [...new Set(subjects.map((s) => s.sem?.toString()).filter(Boolean))];
      const data = await SMSemester.find({ _id: { $in: semIds } })
        .sort({ sem: 1 })
        .lean();
      return { success: true, data };
    }

    if (level === "batches") {
      const subjects = await SMSubject.find({
        college: collegeId,
        course: courseId,
        sem: semesterId,
      })
        .select("batch")
        .lean();
      const batchIds = [...new Set(subjects.map((s) => s.batch?.toString()).filter(Boolean))];
      const data = await SMBatch.find({ _id: { $in: batchIds } })
        .sort({ startyear: -1 })
        .lean();
      return { success: true, data };
    }

    if (level === "subjects") {
      const data = await SMSubject.find({
        college: collegeId,
        course: courseId,
        sem: semesterId,
        batch: batchId,
      })
        .sort({ createdAt: 1 })
        .lean();
      return { success: true, data };
    }

    if (level === "files") {
      const data = await SMFiles.find({ sub: subjectId }).populate("sub").lean();
      return { success: true, data };
    }

    throw new ApiError(400, "Invalid level query parameter");
  }
}

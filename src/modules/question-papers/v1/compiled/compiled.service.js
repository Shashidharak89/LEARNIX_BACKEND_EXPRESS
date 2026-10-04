import mongoose from "mongoose";
import QPImages from "../../../../models/question-papers/QPImages.js";
import QPSubjects from "../../../../models/question-papers/QPSubjects.js";
import QPBatches from "../../../../models/question-papers/QPBatches.js";
import QPExamType from "../../../../models/question-papers/QPExamType.js";

export class QPCompiledService {
  static async getCompiledGroups({
    subjectId,
    collegeId,
    courseId,
    semesterId,
    batchId,
    examTypeId,
    page = 1,
    limit = 20,
  }) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (p - 1) * l;

    const matchStage = {};

    if (subjectId) matchStage.subject = new mongoose.Types.ObjectId(subjectId);
    if (collegeId) matchStage.college = new mongoose.Types.ObjectId(collegeId);
    if (batchId) matchStage.batch = new mongoose.Types.ObjectId(batchId);
    if (examTypeId) matchStage.examtype = new mongoose.Types.ObjectId(examTypeId);

    if (!subjectId && (courseId || semesterId)) {
      const subjectQuery = {};
      if (collegeId) subjectQuery.college = collegeId;
      if (courseId) subjectQuery.course = courseId;
      if (semesterId) subjectQuery.semester = semesterId;

      const validSubjects = await QPSubjects.find(subjectQuery)
        .select("_id")
        .lean();
      const validSubjectIds = validSubjects.map((s) => s._id);
      matchStage.subject = { $in: validSubjectIds };
    }

    let pipeline = [{ $match: matchStage }];
    let countPipeline = [{ $match: matchStage }];

    if (subjectId) {
      const groupStage = {
        $group: {
          _id: "$subject",
          recordCount: { $sum: 1 },
        },
      };
      pipeline.push(groupStage);
      countPipeline.push(groupStage);
    } else {
      const groupStage = {
        $group: {
          _id: { batch: "$batch", examtype: "$examtype" },
          recordCount: { $sum: 1 },
          firstSubject: { $first: "$subject" },
        },
      };
      pipeline.push(groupStage);
      countPipeline.push(groupStage);
    }

    countPipeline.push({ $count: "total" });
    const countResult = await QPImages.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    pipeline.push({ $sort: { _id: 1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: l });

    let results = await QPImages.aggregate(pipeline);

    if (subjectId) {
      results = await QPImages.populate(results, {
        path: "_id",
        model: "QPSubjects",
      });
      results = results.map((r) => ({
        type: "subject",
        subject: r._id,
        recordCount: r.recordCount,
      }));
    } else {
      results = await QPImages.populate(results, [
        { path: "_id.batch", model: "QPBatches" },
        { path: "_id.examtype", model: "QPExamType" },
      ]);
      results = results.map((r) => ({
        type: "group",
        batch: r._id?.batch,
        examtype: r._id?.examtype,
        recordCount: r.recordCount,
      }));
    }

    return {
      success: true,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
      },
      data: results,
    };
  }
}

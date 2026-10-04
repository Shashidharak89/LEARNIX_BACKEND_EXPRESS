import SMUniversity from "../../../../models/study-materials/SMUniversity.js";
import SMCollege from "../../../../models/study-materials/SMCollege.js";
import SMCourse from "../../../../models/study-materials/SMCourse.js";
import SMSemester from "../../../../models/study-materials/SMSemester.js";
import SMBatch from "../../../../models/study-materials/SMBatch.js";
import SMSubject from "../../../../models/study-materials/SMSubject.js";
import SMFiles from "../../../../models/study-materials/SMFiles.js";

const searchConfigs = [
  { model: SMUniversity, name: "university", fields: ["name", "city", "district"] },
  { model: SMCollege, name: "college", fields: ["name", "location"] },
  { model: SMCourse, name: "course", fields: ["name"] },
  { model: SMSubject, name: "subject", fields: ["name"] },
];

export class SMSearchService {
  static async searchAll({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const rawQuery = (q || "").trim();
    const cleanQuery = rawQuery.toLowerCase();
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return {
        success: true,
        pagination: { total: 0, page: p, limit: l, totalPages: 0 },
        data: [],
      };
    }

    const searchPromises = searchConfigs.map(async ({ model, name, fields }) => {
      const orConditions = [];
      words.forEach((w) => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        fields.forEach((field) => {
          orConditions.push({ [field]: { $regex: escaped, $options: "i" } });
        });
      });
      const query = { $or: orConditions };

      const results = await model.find(query).lean();
      return results
        .map((r) => {
          let score = 0;
          const text = fields.map((f) => r[f] || "").join(" ").toLowerCase();
          const primaryName = (r.name || "").toLowerCase();

          if (text.includes(cleanQuery)) score += 20;
          if (primaryName.startsWith(cleanQuery)) score += 10;

          for (const word of words) {
            if (text.includes(word)) {
              score += 5;
            }
          }
          return { ...r, __type: name, __score: score };
        })
        .filter((r) => r.__score > 0);
    });

    const nestedResults = await Promise.all(searchPromises);
    let allResults = nestedResults.flat();
    allResults.sort(
      (a, b) =>
        b.__score - a.__score ||
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    const total = allResults.length;
    const paginatedResults = allResults.slice(skip, skip + l);

    return {
      success: true,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
      data: paginatedResults,
    };
  }

  static async searchUniversities({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const rawQuery = (q || "").trim();
    const cleanQuery = rawQuery.toLowerCase();
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    let query = {};
    if (words.length > 0) {
      const orConditions = [];
      words.forEach((w) => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orConditions.push(
          { name: { $regex: escaped, $options: "i" } },
          { city: { $regex: escaped, $options: "i" } },
          { district: { $regex: escaped, $options: "i" } }
        );
      });
      query = { $or: orConditions };
    }

    const allRecords = await SMUniversity.find(query).lean();

    let scoredRecords = allRecords;
    if (words.length > 0) {
      scoredRecords = allRecords
        .map((r) => {
          let score = 0;
          const uniName = (r.name || "").toLowerCase();
          const city = (r.city || "").toLowerCase();
          const district = (r.district || "").toLowerCase();
          const text = `${uniName} ${city} ${district}`;

          if (text.includes(cleanQuery)) score += 20;
          if (uniName.startsWith(cleanQuery)) score += 10;

          for (const word of words) {
            if (uniName.includes(word)) {
              score += 5;
            } else if (city.includes(word) || district.includes(word)) {
              score += 2;
            }
          }
          return { r, score };
        })
        .filter((item) => item.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (a.r.name || "").localeCompare(b.r.name || "")
        )
        .map((item) => item.r);
    } else {
      scoredRecords.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const total = scoredRecords.length;
    const records = scoredRecords.slice(skip, skip + l);

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

  static async searchColleges({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const rawQuery = (q || "").trim();
    const cleanQuery = rawQuery.toLowerCase();
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    let query = {};
    if (words.length > 0) {
      const uniConditions = words.map((w) => ({
        name: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
      }));
      const matchingUnis = await SMUniversity.find({ $or: uniConditions })
        .select("_id")
        .lean();
      const uniIds = matchingUnis.map((u) => u._id);

      const orConditions = [];
      words.forEach((w) => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orConditions.push(
          { name: { $regex: escaped, $options: "i" } },
          { location: { $regex: escaped, $options: "i" } }
        );
      });
      if (uniIds.length > 0) {
        orConditions.push({ university: { $in: uniIds } });
      }
      query = { $or: orConditions };
    }

    const allRecords = await SMCollege.find(query).populate("university").lean();

    let scoredRecords = allRecords;
    if (words.length > 0) {
      scoredRecords = allRecords
        .map((r) => {
          let score = 0;
          const collegeName = (r.name || "").toLowerCase();
          const location = (r.location || "").toLowerCase();
          const uniName = (r.university?.name || "").toLowerCase();
          const text = `${collegeName} ${location} ${uniName}`;

          if (text.includes(cleanQuery)) score += 20;
          if (collegeName.startsWith(cleanQuery)) score += 10;

          for (const word of words) {
            if (collegeName.includes(word)) {
              score += 5;
            } else if (location.includes(word) || uniName.includes(word)) {
              score += 2;
            }
          }
          return { r, score };
        })
        .filter((item) => item.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (a.r.name || "").localeCompare(b.r.name || "")
        )
        .map((item) => item.r);
    } else {
      scoredRecords.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const total = scoredRecords.length;
    const records = scoredRecords.slice(skip, skip + l);

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

  static async searchCourses({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const rawQuery = (q || "").trim();
    const cleanQuery = rawQuery.toLowerCase();
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    let query = {};
    if (words.length > 0) {
      query = {
        $or: words.map((w) => ({
          name: {
            $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        })),
      };
    }

    const allRecords = await SMCourse.find(query).lean();

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
            (a.r.name || "").localeCompare(b.r.name || "")
        )
        .map((item) => item.r);
    } else {
      scoredRecords.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const total = scoredRecords.length;
    const records = scoredRecords.slice(skip, skip + l);

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

  static async searchSemesters({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const semesters = await SMSemester.find({}).lean();
    const words = (q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);

    let scoredSemesters = semesters;
    if (words.length > 0) {
      scoredSemesters = semesters
        .map((s) => {
          const text = `Semester ${s.sem} ${s.sem} sem ${s.sem}`.toLowerCase();
          let score = 0;
          for (const word of words) {
            if (text.includes(word)) {
              score += 1;
            }
          }
          return { s, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.s.sem - b.s.sem)
        .map((item) => item.s);
    } else {
      scoredSemesters.sort((a, b) => a.sem - b.sem);
    }

    const total = scoredSemesters.length;
    const records = scoredSemesters.slice(skip, skip + l);

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

  static async searchBatches({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const batches = await SMBatch.find({}).lean();
    const words = (q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);

    let scoredBatches = batches;
    if (words.length > 0) {
      scoredBatches = batches
        .map((b) => {
          const text = `Batch ${b.startyear}-${b.endyear} ${b.startyear} ${b.endyear}`.toLowerCase();
          let score = 0;
          for (const word of words) {
            if (text.includes(word)) {
              score += 1;
            }
          }
          return { b, score };
        })
        .filter((item) => item.score > 0)
        .sort(
          (a, b) => b.score - a.score || b.b.startyear - a.b.startyear
        )
        .map((item) => item.b);
    } else {
      scoredBatches.sort((a, b) => b.startyear - a.startyear);
    }

    const total = scoredBatches.length;
    const records = scoredBatches.slice(skip, skip + l);

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

  static async searchSubjects({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const rawQuery = (q || "").trim();
    const cleanQuery = rawQuery.toLowerCase();
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    let query = {};
    if (words.length > 0) {
      const courseOr = words.map((w) => ({
        name: {
          $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      }));
      const matchingCourses = await SMCourse.find({ $or: courseOr })
        .select("_id")
        .lean();
      const courseIds = matchingCourses.map((c) => c._id);

      const collegeOr = words.flatMap((w) => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return [
          { name: { $regex: escaped, $options: "i" } },
          { location: { $regex: escaped, $options: "i" } },
        ];
      });
      const matchingColleges = await SMCollege.find({ $or: collegeOr })
        .select("_id")
        .lean();
      const collegeIds = matchingColleges.map((c) => c._id);

      const subjectOr = words.map((w) => ({
        name: {
          $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      }));

      if (courseIds.length > 0) {
        subjectOr.push({ course: { $in: courseIds } });
      }
      if (collegeIds.length > 0) {
        subjectOr.push({ college: { $in: collegeIds } });
      }

      query = { $or: subjectOr };
    }

    const allRecords = await SMSubject.find(query)
      .populate("college")
      .populate("course")
      .populate("sem")
      .populate("batch")
      .lean();

    let scoredRecords = allRecords;
    if (words.length > 0) {
      scoredRecords = allRecords
        .map((r) => {
          let score = 0;
          const subjectName = (r.name || "").toLowerCase();
          const courseName = (r.course?.name || "").toLowerCase();
          const collegeName = (r.college?.name || "").toLowerCase();
          const fullCombinedText = `${subjectName} ${courseName} ${collegeName}`;

          if (subjectName.includes(cleanQuery)) {
            score += 20;
          }
          if (subjectName.startsWith(cleanQuery)) {
            score += 10;
          }

          for (const word of words) {
            if (subjectName.includes(word)) {
              score += 5;
            } else if (courseName.includes(word) || collegeName.includes(word)) {
              score += 2;
            }
          }

          return { r, score };
        })
        .filter((item) => item.score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (a.r.name || "").localeCompare(b.r.name || "")
        )
        .map((item) => item.r);
    } else {
      scoredRecords.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    const total = scoredRecords.length;
    const records = scoredRecords.slice(skip, skip + l);

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

  static async searchTree({ q = "", page = 1, limit = 20 }) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, parseInt(limit) || 20);
    const skip = (p - 1) * l;

    const words = (q || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return {
        success: true,
        pagination: { total: 0, page: p, limit: l, totalPages: 0 },
        data: [],
      };
    }

    const uniOrConditions = words.map((w) => ({
      name: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    }));
    const collegeOrConditions = words.map((w) => ({
      name: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    }));
    const courseOrConditions = words.map((w) => ({
      name: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    }));
    const fileOrConditions = [];
    words.forEach((w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      fileOrConditions.push(
        { name: { $regex: esc, $options: "i" } },
        { fileurl: { $regex: esc, $options: "i" } }
      );
    });

    const [
      uniMatches,
      collegeMatches,
      courseMatches,
      semesters,
      batches,
      fileMatches,
    ] = await Promise.all([
      SMUniversity.find({ $or: uniOrConditions }).select("_id").lean(),
      SMCollege.find({ $or: collegeOrConditions }).select("_id").lean(),
      SMCourse.find({ $or: courseOrConditions }).select("_id").lean(),
      SMSemester.find({}).lean(),
      SMBatch.find({}).lean(),
      SMFiles.find({ $or: fileOrConditions }).select("_id sub").lean(),
    ]);

    const uniIds = uniMatches.map((u) => u._id);
    const collegeIds = collegeMatches.map((c) => c._id);
    const courseIds = courseMatches.map((c) => c._id);
    const fileParentSubjectIds = fileMatches.map((f) => f.sub);

    const semIds = semesters
      .filter((s) => {
        const text = `Semester ${s.sem} ${s.sem} sem ${s.sem}`.toLowerCase();
        return words.some((w) => text.includes(w));
      })
      .map((s) => s._id);

    const batchIds = batches
      .filter((b) => {
        const text = `Batch ${b.startyear}-${b.endyear} ${b.startyear} ${b.endyear}`.toLowerCase();
        return words.some((w) => text.includes(w));
      })
      .map((b) => b._id);

    const collegeMatchesResolved = await SMCollege.find({
      $or: [{ _id: { $in: collegeIds } }, { university: { $in: uniIds } }],
    })
      .select("_id")
      .lean();
    const collegeIdsResolved = collegeMatchesResolved.map((c) => c._id);

    const subjectOrConditions = words.map((w) => ({
      name: { $regex: w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    }));
    if (collegeIdsResolved.length > 0)
      subjectOrConditions.push({ college: { $in: collegeIdsResolved } });
    if (courseIds.length > 0)
      subjectOrConditions.push({ course: { $in: courseIds } });
    if (semIds.length > 0)
      subjectOrConditions.push({ sem: { $in: semIds } });
    if (batchIds.length > 0)
      subjectOrConditions.push({ batch: { $in: batchIds } });
    if (fileParentSubjectIds.length > 0)
      subjectOrConditions.push({ _id: { $in: fileParentSubjectIds } });

    const matchingSubjects = await SMSubject.find({ $or: subjectOrConditions })
      .populate({
        path: "college",
        populate: { path: "university" },
      })
      .populate("course")
      .populate("sem")
      .populate("batch")
      .lean();

    const validSubjects = matchingSubjects.filter(
      (s) => s.college && s.college.university && s.course && s.sem && s.batch
    );

    const subjectIds = validSubjects.map((s) => s._id);
    const allFilesForSubjects = await SMFiles.find({
      sub: { $in: subjectIds },
    }).lean();

    const uniMap = new Map();

    for (const subject of validSubjects) {
      const college = subject.college;
      const university = college.university;
      const course = subject.course;
      const sem = subject.sem;
      const batch = subject.batch;

      if (!uniMap.has(university._id.toString())) {
        uniMap.set(university._id.toString(), {
          ...university,
          collegesMap: new Map(),
        });
      }
      const uniNode = uniMap.get(university._id.toString());

      if (!uniNode.collegesMap.has(college._id.toString())) {
        uniNode.collegesMap.set(college._id.toString(), {
          ...college,
          coursesMap: new Map(),
        });
      }
      const collegeNode = uniNode.collegesMap.get(college._id.toString());

      if (!collegeNode.coursesMap.has(course._id.toString())) {
        collegeNode.coursesMap.set(course._id.toString(), {
          ...course,
          semestersMap: new Map(),
        });
      }
      const courseNode = collegeNode.coursesMap.get(course._id.toString());

      if (!courseNode.semestersMap.has(sem._id.toString())) {
        courseNode.semestersMap.set(sem._id.toString(), {
          ...sem,
          batchesMap: new Map(),
        });
      }
      const semNode = courseNode.semestersMap.get(sem._id.toString());

      if (!semNode.batchesMap.has(batch._id.toString())) {
        semNode.batchesMap.set(batch._id.toString(), {
          ...batch,
          subjectsMap: new Map(),
        });
      }
      const batchNode = semNode.batchesMap.get(batch._id.toString());

      if (!batchNode.subjectsMap.has(subject._id.toString())) {
        const subjectFiles = allFilesForSubjects.filter(
          (f) => f.sub.toString() === subject._id.toString()
        );

        subjectFiles.sort((a, b) => {
          const nameA = (
            a.name || a.fileurl.split("/").pop().split("?")[0]
          ).toLowerCase();
          const nameB = (
            b.name || b.fileurl.split("/").pop().split("?")[0]
          ).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        batchNode.subjectsMap.set(subject._id.toString(), {
          ...subject,
          children: subjectFiles,
        });
      }
    }

    const universitiesList = Array.from(uniMap.values()).map((uni) => {
      const colleges = Array.from(uni.collegesMap.values()).map((coll) => {
        const courses = Array.from(coll.coursesMap.values()).map((crs) => {
          const semesters = Array.from(crs.semestersMap.values()).map((sm) => {
            const batches = Array.from(sm.batchesMap.values()).map((bt) => {
              const subjects = Array.from(bt.subjectsMap.values());
              subjects.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
              );
              return {
                ...bt,
                children: subjects,
              };
            });
            batches.sort((a, b) => a.startyear - b.startyear);
            return {
              ...sm,
              children: batches,
            };
          });
          semesters.sort((a, b) => a.sem - b.sem);
          return {
            ...crs,
            children: semesters,
          };
        });
        courses.sort((a, b) => a.name.localeCompare(b.name));
        return {
          ...coll,
          children: courses,
        };
      });
      colleges.sort((a, b) => a.name.localeCompare(b.name));
      return {
        ...uni,
        children: colleges,
      };
    });

    universitiesList.forEach((uni) => {
      let score = 0;
      const treeText = JSON.stringify(uni).toLowerCase();
      for (const word of words) {
        if (treeText.includes(word)) {
          score += 1;
        }
      }
      uni.__score = score;
    });

    universitiesList.sort(
      (a, b) => b.__score - a.__score || a.name.localeCompare(b.name)
    );

    const total = universitiesList.length;
    const paginatedUniversities = universitiesList.slice(skip, skip + l);

    return {
      success: true,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
      data: paginatedUniversities,
    };
  }
}

import materialsData from "./materialsData.js";

function displayName(file) {
  const explicit = file.name != null ? String(file.name).trim() : "";
  if (explicit) return explicit;
  const raw = file.url.split("/").pop().split("?")[0] || "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function withDecodedFileNames(data) {
  return data.map((semester) => ({
    ...semester,
    subjects: semester.subjects.map((subject) => ({
      ...subject,
      files: subject.files.map((file) => ({
        url: file.url,
        name: displayName(file),
      })),
    })),
  }));
}

export class LegacyMaterialsService {
  static getDecodedMaterials() {
    return withDecodedFileNames(materialsData);
  }
}

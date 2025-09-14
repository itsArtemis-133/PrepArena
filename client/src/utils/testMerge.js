import dayjs from "dayjs";

const NUMERIC_KEYS = new Set(["duration", "questionCount"]);
const BOOL_KEYS = new Set(["isPublic", "isCreator"]);
const SIMPLE_KEYS = [
  "title",
  "description",
  "subject",
  "type",
  "testMode",
  "duration",
  "questionCount",
  "scheduledDate",
  "status",
  "isPublic",
  "pdfUrl",
  "link",
  "isCreator",
  "syllabus",
  "registrationCount",
  "answersPdfUrl",
  "answersPdfFilename",
  "pdfFilename",
];

const isEmpty = (k, v) => {
  if (v === undefined || v === null) return true;
  if (NUMERIC_KEYS.has(k)) return !Number.isFinite(Number(v)) || Number(v) <= 0;
  if (k === "scheduledDate") return !dayjs(v).isValid();
  if (BOOL_KEYS.has(k)) return typeof v !== "boolean";
  if (typeof v === "string") return v.trim() === "";
  return false;
};
const prefer = (k, prev, next) => (isEmpty(k, next) ? prev : next);

export function mergeTest(prev = {}, next = {}, debugRows = []) {
  const merged = { ...prev, ...next };

  SIMPLE_KEYS.forEach((k) => {
    merged[k] = prefer(k, prev[k], next[k]);
    if (debugRows)
      debugRows.push({ field: k, prev: prev[k], next: next[k], chosen: merged[k] });
  });

  merged.createdBy = {
    _id: prefer("_id", prev?.createdBy?._id, next?.createdBy?._id),
    username: prefer("username", prev?.createdBy?.username, next?.createdBy?.username),
    creatorRatingAvg: prefer(
      "creatorRatingAvg",
      prev?.createdBy?.creatorRatingAvg,
      next?.createdBy?.creatorRatingAvg
    ),
    creatorRatingCount: prefer(
      "creatorRatingCount",
      prev?.createdBy?.creatorRatingCount,
      next?.createdBy?.creatorRatingCount
    ),
  };

  return merged;
}

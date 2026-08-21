/**
 * Upload allowlist — STRICT medical document types only:
 *   PDF, DOCX, XLSX, JPG, PNG, TIFF, DICOM.
 *
 * Everything else (including executables, scripts, HTML, archives, office
 * legacy formats) is blocked. A file is accepted when its extension is in
 * the allowlist AND (if a MIME type was supplied) the MIME type is an
 * allowed medical/document type.
 */
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".dcm",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
]);

const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "application/dicom",
  "application/dcm",
  "image/jpeg",
  "image/png",
  "image/tiff",
]);

const ALLOWED_MIME_PREFIXES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.",
];

/** Whether an uploaded file name + MIME type is an allowed medical file. */
export function isAllowedUpload(fileName: string, mimeType: string | null): boolean {
  const ext = getFileExtension(fileName);
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }
  const mime = (mimeType ?? "").toLowerCase();
  if (mime) {
    if (mime.startsWith("video/")) return true;
    if (ALLOWED_MIME_EXACT.has(mime)) return true;
    if (ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) return true;
    return false;
  }
  // No MIME type supplied — extension alone decides.
  return true;
}

function getFileExtension(name: string): string {
  const base = name.toLowerCase();
  const slash = base.lastIndexOf("/");
  const dot = base.lastIndexOf(".");
  const ext = dot > slash ? base.slice(dot) : "";
  return ext;
}
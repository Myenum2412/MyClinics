/**
 * Upload allowlist — only office / document / image files are permitted.
 * Blocks programming and executable files (e.g. .js, .ts, .py, .html, .exe).
 *
 * A file is accepted when its extension is in the allowlist AND (if a MIME
 * type was supplied) the MIME type is an allowed office/document/image type.
 * When a file has no extension, the MIME type alone decides.
 */
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".bmp",
  ".tif",
  ".tiff",
  ".svg",
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".txt",
  ".xls",
  ".xlsx",
  ".csv",
  ".ods",
  ".ppt",
  ".pptx",
  ".odp",
]);

const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "application/msword",
  "application/rtf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "text/comma-separated-values",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]);

const ALLOWED_MIME_PREFIXES = [
  "image/",
  "text/",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.",
  "application/vnd.openxmlformats-officedocument.presentationml.",
];

function getFileExtension(name: string): string {
  const base = name.toLowerCase();
  const slash = base.lastIndexOf("/");
  const dot = base.lastIndexOf(".");
  const ext = dot > slash ? base.slice(dot) : "";
  return ext;
}

/** Whether an uploaded file name + MIME type is an allowed office file. */
export function isAllowedUpload(fileName: string, mimeType: string | null): boolean {
  const ext = getFileExtension(fileName);
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }
  const mime = (mimeType ?? "").toLowerCase();
  if (mime) {
    if (ALLOWED_MIME_EXACT.has(mime)) return true;
    if (ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) return true;
    return false;
  }
  return true;
}
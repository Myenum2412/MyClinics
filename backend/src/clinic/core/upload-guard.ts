/**
 * Upload allowlist — STRICT medical document types only.
 * SEC-005: extension-first, MIME strict, magic-byte validation.
 */

const EXT_TO_MIMES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".tif": ["image/tiff"],
  ".tiff": ["image/tiff"],
  ".dcm": ["application/dicom", "application/dcm"],
  ".mp4": ["video/mp4"],
  ".webm": ["video/webm"],
  ".mov": ["video/quicktime"],
  ".avi": ["video/x-msvideo"],
  ".mkv": ["video/x-matroska"],
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(EXT_TO_MIMES));

/** Whether an uploaded file name + MIME type is an allowed medical file (extension + mime strict). */
export function isAllowedUpload(fileName: string, mimeType: string | null): boolean {
  const ext = getFileExtension(fileName);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!mimeType) return true; // extension passed, caller will still validate magic bytes
  const mime = mimeType.toLowerCase().trim();
  const allowed = EXT_TO_MIMES[ext];
  return allowed.includes(mime);
}

/** Full validation including magic bytes (SEC-005). */
export function isAllowedUploadWithMagic(
  fileName: string,
  mimeType: string | null,
  buffer: Buffer | Uint8Array
): boolean {
  if (!isAllowedUpload(fileName, mimeType)) return false;
  const ext = getFileExtension(fileName);
  const magic = getMagicValidation(Buffer.from(buffer.slice(0, 16)), ext);
  // If we can definitively detect mismatch (e.g. PDF without %PDF), reject.
  if (magic === false) return false;
  return true;
}

function getMagicValidation(head: Buffer, ext: string): boolean | null {
  if (head.length === 0) return null;
  // PDF: %PDF
  if (ext === ".pdf") return head.slice(0, 4).toString() === "%PDF";
  // PNG: 89 50 4E 47
  if (ext === ".png") return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  // JPG: FF D8 FF
  if (ext === ".jpg" || ext === ".jpeg") return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if (ext === ".tif" || ext === ".tiff") {
    return (head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a) ||
           (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00);
  }
  // DOCX/XLSX are ZIP: PK 03 04
  if (ext === ".docx" || ext === ".xlsx") return head[0] === 0x50 && head[1] === 0x4b;
  // DICOM: 128 bytes preamble + DICM at 128
  if (ext === ".dcm") {
    // Accept both with and without preamble for leniency; if buffer is <132, skip.
    if (head.length < 132) return null;
    return head.slice(128, 132).toString() === "DICM";
  }
  // Video: MP4 ftyp, WebM 1A 45 DF A3 (EBML), others we allow without strict magic to avoid false negatives
  if (ext === ".mp4") return head.slice(4, 8).toString() === "ftyp" || head[0] === 0x00;
  if (ext === ".webm" || ext === ".mkv") return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf;
  if (ext === ".mov") return head.slice(4, 8).toString() === "ftyp" || head.slice(4, 8).toString() === "moov";
  if (ext === ".avi") return head.slice(0, 4).toString() === "RIFF";
  return null; // unknown / not strictly validated
}

function getFileExtension(name: string): string {
  // Prevent path traversal: take basename only
  const base = name.split(/[\\/]/).pop() ?? name;
  const lower = base.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1 || dot === lower.length - 1) return "";
  const ext = lower.slice(dot);
  // Reject double extensions like .pdf.exe by only allowing single final ext already checked, but also reject names with null bytes or control chars
  if (ext.includes("\0") || /[\x00-\x1f]/.test(ext)) return "";
  return ext;
}

export function sanitizeFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "file";
}

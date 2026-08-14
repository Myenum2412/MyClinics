import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
} from "lucide-react";

export type FileCategory =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "sheet"
  | "slide"
  | "doc"
  | "code"
  | "other";

const ARCHIVE_EXT = ["zip", "rar", "7z", "tar", "gz", "bz2"];
const SHEET_EXT = ["xls", "xlsx", "csv", "ods", "numbers"];
const SLIDE_EXT = ["ppt", "pptx", "key"];
const DOC_EXT = ["doc", "docx", "txt", "rtf", "md", "odt"];
const CODE_EXT = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "html",
  "css",
  "json",
  "py",
  "java",
  "c",
  "cpp",
  "go",
  "rs",
  "sql",
];

export function fileCategory(type: string, extension: string): FileCategory {
  if (type === "application/pdf" || extension === "pdf") return "pdf";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (ARCHIVE_EXT.includes(extension)) return "archive";
  if (SHEET_EXT.includes(extension)) return "sheet";
  if (SLIDE_EXT.includes(extension)) return "slide";
  if (DOC_EXT.includes(extension)) return "doc";
  if (CODE_EXT.includes(extension)) return "code";
  return "other";
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateFmt.format(d);
}

export function FileTypeIcon({
  category,
  className = "size-6",
}: {
  category: FileCategory;
  className?: string;
}) {
  switch (category) {
    case "pdf":
      return <FileText className={className} />;
    case "image":
      return <FileImage className={className} />;
    case "video":
      return <FileVideo className={className} />;
    case "audio":
      return <FileAudio className={className} />;
    case "archive":
      return <FileArchive className={className} />;
    case "sheet":
      return <FileSpreadsheet className={className} />;
    case "slide":
      return <Presentation className={className} />;
    case "code":
      return <FileCode className={className} />;
    case "doc":
      return <FileText className={className} />;
    default:
      return <File className={className} />;
  }
}

export function fileCategoryColor(category: FileCategory) {
  switch (category) {
    case "pdf":
      return "bg-red-500/10 text-red-500";
    case "image":
      return "bg-violet-500/10 text-violet-500";
    case "video":
      return "bg-pink-500/10 text-pink-500";
    case "audio":
      return "bg-amber-500/10 text-amber-500";
    case "archive":
      return "bg-orange-500/10 text-orange-500";
    case "sheet":
      return "bg-emerald-500/10 text-emerald-500";
    case "slide":
      return "bg-rose-500/10 text-rose-500";
    case "code":
      return "bg-sky-500/10 text-sky-500";
    case "doc":
      return "bg-blue-500/10 text-blue-500";
    default:
      return "bg-muted text-muted-foreground";
  }
}

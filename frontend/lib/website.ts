export type GrapesWebsiteData = {
  html: string;
  css: string;
  /** GrapesJS project data, kept so the editor reopens with full fidelity. */
  project?: unknown;
};

export function isGrapesWebsiteData(value: unknown): value is GrapesWebsiteData {
  if (typeof value !== "object" || value === null) return false;
  const page = value as Partial<GrapesWebsiteData>;
  return typeof page.html === "string" && typeof page.css === "string";
}

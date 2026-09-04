import { describe, it, expect } from "vitest";
import { isAllowedUpload, isAllowedUploadWithMagic } from "@/clinic/core/upload-guard";
import { escapeRegex, parsePagination } from "@/clinic/core/pagination";
import { buildServer } from "@/app";

describe("SEC-001 CORS", () => {
  it("rejects unknown origin", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/clinics/auth/login",
      headers: { origin: "https://evil.com", "access-control-request-method": "POST" },
    });
    // Fastify cors will not set allow-origin for evil
    expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.com");
  });
  it("allows configured origin", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/clinics/auth/login",
      headers: { origin: "http://localhost:3456", "access-control-request-method": "POST" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3456");
  });
});

describe("SEC-005 upload guard", () => {
  it("rejects html with video mime spoof", () => {
    expect(isAllowedUpload("x.html", "video/mp4")).toBe(false);
  });
  it("rejects empty extension", () => {
    expect(isAllowedUpload("file", "application/pdf")).toBe(false);
  });
  it("allows real pdf", () => {
    expect(isAllowedUpload("report.pdf", "application/pdf")).toBe(true);
  });
  it("rejects pdf with wrong magic", () => {
    const buf = Buffer.from("HTML<html>");
    expect(isAllowedUploadWithMagic("report.pdf", "application/pdf", buf)).toBe(false);
  });
  it("allows png with correct magic", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(isAllowedUploadWithMagic("img.png", "image/png", buf)).toBe(true);
  });
});

describe("SEC-007 cron secret", () => {
  it("rejects query param secret", async () => {
    const app = buildServer();
    process.env.CRON_SECRET = "test-secret";
    const res = await app.inject({ method: "POST", url: "/api/cron/reminders?secret=test-secret" });
    expect(res.statusCode).toBe(401);
    delete process.env.CRON_SECRET;
  });
  it("accepts header secret", async () => {
    const app = buildServer();
    process.env.CRON_SECRET = "test-secret";
    const res = await app.inject({ method: "POST", url: "/api/cron/reminders", headers: { "x-cron-secret": "test-secret" } });
    // May be 200 or 500 if DB not configured, but not 401
    expect(res.statusCode).not.toBe(401);
    delete process.env.CRON_SECRET;
  });
});

describe("SEC-011 regex / pagination", () => {
  it("escapes regex", () => {
    expect(escapeRegex("a.*b")).toBe("a\\.\\*b");
  });
  it("caps pagination skip", () => {
    const { skip } = parsePagination({ page: "9999", limit: "100" });
    expect(skip).toBeLessThanOrEqual(10000);
  });
});

describe("SEC-008 backend headers", () => {
  it("sets security headers", async () => {
    const app = buildServer();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["vary"]).toContain("Origin");
  });
});

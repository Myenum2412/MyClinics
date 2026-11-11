import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  passwordResetUrl,
  renderPasswordResetEmail,
} from "@/services/email/password-reset-email";

const TOKEN = "secret-reset-token-1234567890abcdef";
let previousAppUrl: string | undefined;

beforeEach(() => {
  previousAppUrl = process.env.EMAIL_APP_URL;
  process.env.EMAIL_APP_URL = "https://myclinic.myenum.in";
});

afterEach(() => {
  if (previousAppUrl === undefined) delete process.env.EMAIL_APP_URL;
  else process.env.EMAIL_APP_URL = previousAppUrl;
});

describe("password reset email", () => {
  it("links to the forgot-password page with the token only in the href", () => {
    const { html, text, subject } = renderPasswordResetEmail({
      to: "doc@clinic.test",
      name: "Dr. Meera",
      token: TOKEN,
    });

    expect(subject).toBe("Reset your MyClinics password");
    expect(passwordResetUrl(TOKEN)).toBe(
      `https://myclinic.myenum.in/forgot-password?token=${TOKEN}`
    );
    expect(html).toContain(`href="https://myclinic.myenum.in/forgot-password?token=${TOKEN}"`);
    expect(html).toContain("Reset password");
    expect(html).toContain("Dr. Meera".split(" ")[0]);

    // Token must never be printed as visible text.
    expect(text).not.toContain(TOKEN);
    expect(html).not.toContain("Copy this link");
    expect(html).not.toContain(`>${TOKEN}<`);
  });

  it("has a logo and a role-neutral message", () => {
    const { html } = renderPasswordResetEmail({
      to: "patient@example.com",
      name: "Asha",
      token: TOKEN,
    });

    expect(html).toContain("logo-wordmark.png");
    expect(html).toContain("MyClinics account");
  });
});

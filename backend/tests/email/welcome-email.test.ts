import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  pickWelcomeQuote,
  renderSignupWelcomeEmail,
} from "@/services/email/welcome-email";

let previousAppUrl: string | undefined;

beforeEach(() => {
  previousAppUrl = process.env.EMAIL_APP_URL;
  // Local URLs cannot serve images to mail clients, so the logo is inlined.
  process.env.EMAIL_APP_URL = "http://localhost:3000";
});

afterEach(() => {
  if (previousAppUrl === undefined) delete process.env.EMAIL_APP_URL;
  else process.env.EMAIL_APP_URL = previousAppUrl;
});

describe("signup welcome email", () => {
  it("renders subject, quote, clinic name and inline logo", () => {
    const { subject, html, text, attachments } = renderSignupWelcomeEmail({
      to: "owner@clinic.test",
      name: "Ravi Kumar",
      clinicName: "Sunrise Clinic",
    });

    expect(subject).toBe("Welcome to MyClinics, Ravi!");
    expect(html).toContain("Sunrise Clinic");
    expect(html).toContain("Hi Ravi,");
    expect(html).toContain("cid:myclinics-logo");
    expect(text).toContain("Welcome to MyClinics");
    expect(text).toContain("Warm regards");

    expect(attachments).toHaveLength(1);
    expect(attachments[0].contentId).toBe("myclinics-logo");
    expect(attachments[0].contentType).toBe("image/png");
    expect(attachments[0].content.length).toBeGreaterThan(1000);
  });

  it("uses the hosted logo when the app has a public URL", () => {
    process.env.EMAIL_APP_URL = "https://myclinic.myenum.in";

    const { html, attachments } = renderSignupWelcomeEmail({
      to: "owner@clinic.test",
      name: "Ravi",
      clinicName: "Sunrise Clinic",
    });

    expect(html).toContain("https://myclinic.myenum.in/logo-wordmark.png");
    expect(html).not.toContain("cid:myclinics-logo");
    expect(attachments).toHaveLength(0);
  });

  it("escapes HTML in user-provided values", () => {
    const { html } = renderSignupWelcomeEmail({
      to: "x@y.test",
      name: "<script>alert(1)</script>",
      clinicName: "Clinic & Co <b>",
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Clinic &amp; Co &lt;b&gt;");
  });

  it("always picks a quote with text and author", () => {
    for (let i = 0; i < 20; i++) {
      const quote = pickWelcomeQuote();
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });
});

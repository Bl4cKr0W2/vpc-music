import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { env } from "../../src/config/env.js";
import { sendEmail, buildResetEmail, buildInviteEmail } from "../../src/utils/email.js";

const originalEnv = {
  MAILGUN_API_KEY: env.MAILGUN_API_KEY,
  MAILGUN_DOMAIN: env.MAILGUN_DOMAIN,
  MAILGUN_API_BASE_URL: env.MAILGUN_API_BASE_URL,
};

beforeEach(() => {
  vi.restoreAllMocks();
  env.MAILGUN_API_KEY = "";
  env.MAILGUN_DOMAIN = "";
  env.MAILGUN_API_BASE_URL = "https://api.mailgun.net";
});

// ── buildResetEmail ─────────────────────────────
describe("buildResetEmail", () => {
  it("returns an HTML string containing the reset URL", () => {
    const html = buildResetEmail("https://app.test/reset-password?token=abc123");
    expect(html).toContain("https://app.test/reset-password?token=abc123");
  });

  it("contains brand elements", () => {
    const html = buildResetEmail("https://example.com/reset");
    expect(html).toContain("VPC Music");
    expect(html).toContain("#ca9762"); // brand gold
    expect(html).toContain("#000435"); // brand navy
  });

  it("contains reset-specific copy", () => {
    const html = buildResetEmail("https://example.com/reset");
    expect(html).toContain("Reset Your Password");
    expect(html).toContain("1 hour");
    expect(html).toContain("Reset Password"); // CTA button text
  });

  it("wraps content in full HTML document", () => {
    const html = buildResetEmail("https://example.com/reset");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});

// ── buildInviteEmail ────────────────────────────
describe("buildInviteEmail", () => {
  it("returns HTML containing the invite URL", () => {
    const html = buildInviteEmail({
      inviteUrl: "https://app.test/login?email=a@b.com",
      displayName: "John",
    });
    expect(html).toContain("https://app.test/login?email=a@b.com");
  });

  it("uses displayName when provided", () => {
    const html = buildInviteEmail({
      inviteUrl: "https://app.test/login",
      displayName: "John",
    });
    expect(html).toContain("Hi John,");
  });

  it("throws when displayName is missing", () => {
    expect(() => buildInviteEmail({ inviteUrl: "https://app.test/login" })).toThrow(
      "Display name is required to build an invite email",
    );
  });

  it("mentions the org name when provided", () => {
    const html = buildInviteEmail({
      inviteUrl: "https://app.test/login",
      displayName: "John",
      orgName: "Victory Church",
    });
    expect(html).toContain("Victory Church");
    expect(html).toContain("worship team");
  });

  it("uses generic team text without orgName", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login", displayName: "John" });
    expect(html).toContain("a worship team");
  });

  it("contains invite-specific copy", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login", displayName: "John" });
    expect(html).toContain("You're Invited!");
    expect(html).toContain("Accept Invitation");
  });

  it("wraps content in full HTML document", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login", displayName: "John" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});

// ── sendEmail ───────────────────────────────────
describe("sendEmail", () => {
  it("falls back to dev logging mode when Mailgun API config is missing", async () => {
    const info = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(info).toBeDefined();
    expect(info.message).toBeDefined();

    const envelope = JSON.parse(info.message);
    expect(envelope.to).toContainEqual({ address: "test@example.com", name: "" });
    expect(envelope.subject).toBe("Test Subject");
    expect(envelope.html).toBe("<p>Hello</p>");
  });

  it("includes the configured from address", async () => {
    const info = await sendEmail({
      to: "user@example.com",
      subject: "From Test",
      html: "<p>Hi</p>",
    });

    const envelope = JSON.parse(info.message);
    expect(envelope.from).toBeDefined();
  });

  it("sends through the Mailgun API when API credentials are configured", async () => {
    env.MAILGUN_API_KEY = "key-test";
    env.MAILGUN_DOMAIN = "mg.example.com";
    env.MAILGUN_API_BASE_URL = "https://api.mailgun.test";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: "mailgun-id-123", message: "Queued. Thank you." }),
    });

    const info = await sendEmail({
      to: "user@example.com",
      subject: "API Test",
      html: "<p>Hello API</p>",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.mailgun.test/v3/mg.example.com/messages");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toContain("Basic ");
    expect(String(options.body)).toContain("subject=API+Test");
    expect(info.id).toBe("mailgun-id-123");
  });
});

afterAll(() => {
  env.MAILGUN_API_KEY = originalEnv.MAILGUN_API_KEY;
  env.MAILGUN_DOMAIN = originalEnv.MAILGUN_DOMAIN;
  env.MAILGUN_API_BASE_URL = originalEnv.MAILGUN_API_BASE_URL;
});

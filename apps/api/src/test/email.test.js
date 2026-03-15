import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, buildResetEmail, buildInviteEmail } from "../../src/utils/email.js";

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
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login?email=a@b.com" });
    expect(html).toContain("https://app.test/login?email=a@b.com");
  });

  it("uses displayName when provided", () => {
    const html = buildInviteEmail({
      inviteUrl: "https://app.test/login",
      displayName: "John",
    });
    expect(html).toContain("Hi John,");
  });

  it("uses generic greeting without displayName", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login" });
    expect(html).toContain("Hi,");
    expect(html).not.toContain("Hi undefined,");
  });

  it("mentions the org name when provided", () => {
    const html = buildInviteEmail({
      inviteUrl: "https://app.test/login",
      orgName: "Victory Church",
    });
    expect(html).toContain("Victory Church");
    expect(html).toContain("worship team");
  });

  it("uses generic team text without orgName", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login" });
    expect(html).toContain("a worship team");
  });

  it("contains invite-specific copy", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login" });
    expect(html).toContain("You're Invited!");
    expect(html).toContain("Accept Invitation");
  });

  it("wraps content in full HTML document", () => {
    const html = buildInviteEmail({ inviteUrl: "https://app.test/login" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});

// ── sendEmail ───────────────────────────────────
describe("sendEmail", () => {
  it("sends via jsonTransport in dev mode and returns info", async () => {
    // Without MAILGUN_SMTP_USER set, sendEmail uses jsonTransport
    const info = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(info).toBeDefined();
    // jsonTransport returns a message property with the envelope JSON
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
});

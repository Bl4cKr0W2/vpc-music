/**
 * Email utility — sends transactional emails via Mailgun SMTP (nodemailer).
 *
 * In development (no MAILGUN_SMTP_USER set), emails are logged to console.
 * In production, emails go through Mailgun's SMTP relay.
 */

import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/** @type {import("nodemailer").Transporter | null} */
let transporter = null;

/**
 * Lazily create the nodemailer transporter.
 * Uses Mailgun SMTP when credentials are present, otherwise logs to console.
 */
function getTransporter() {
  if (transporter) return transporter;

  if (env.MAILGUN_SMTP_USER && env.MAILGUN_SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.MAILGUN_SMTP_HOST,
      port: env.MAILGUN_SMTP_PORT,
      secure: env.MAILGUN_SMTP_PORT === 465,
      auth: {
        user: env.MAILGUN_SMTP_USER,
        pass: env.MAILGUN_SMTP_PASS,
      },
    });
    logger.info("Email transport: Mailgun SMTP");
  } else {
    // Dev fallback — log to console instead of sending
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    logger.info("Email transport: console (no MAILGUN credentials)");
  }

  return transporter;
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string }} options
 */
export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  const from = env.EMAIL_FROM;

  const info = await transport.sendMail({ from, to, subject, html });

  if (!env.MAILGUN_SMTP_USER) {
    // Dev mode — log the email JSON so developers can see it
    logger.info(`📧 Email (dev): to=${to} subject="${subject}"`);
    logger.debug(info.message); // JSON envelope
  } else {
    logger.info(`📧 Email sent: to=${to} subject="${subject}" messageId=${info.messageId}`);
  }

  return info;
}

// ── Email templates ──────────────────────────────────────────

const BRAND_COLOR = "#ca9762";
const BRAND_NAVY = "#000435";

/**
 * Shared HTML wrapper for all emails.
 */
function emailWrapper(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter','Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <!-- Header -->
    <div style="background:${BRAND_NAVY};padding:24px 32px;text-align:center">
      <h1 style="margin:0;font-family:'Vidaloka',Georgia,serif;color:${BRAND_COLOR};font-size:24px;font-weight:400">VPC Music</h1>
    </div>
    <!-- Body -->
    <div style="padding:32px">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;text-align:center;font-size:12px;color:#6b7280">
      VPC Music — Worship team chord chart manager
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build the password-reset email HTML.
 * @param {string} resetUrl — full URL to the reset-password page with token
 * @returns {string} HTML
 */
export function buildResetEmail(resetUrl) {
  return emailWrapper(`
    <h2 style="margin:0 0 16px;color:${BRAND_NAVY};font-size:20px">Reset Your Password</h2>
    <p style="color:#374151;line-height:1.6;margin:0 0 24px">
      We received a request to reset your password. Click the button below to choose a new one.
      This link expires in <strong>1 hour</strong>.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px">
        Reset Password
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);
}

/**
 * Build the team-invite email HTML.
 * @param {{ inviteUrl: string, displayName?: string, orgName?: string }} opts
 * @returns {string} HTML
 */
export function buildInviteEmail({ inviteUrl, displayName, orgName }) {
  const greeting = displayName ? `Hi ${displayName},` : "Hi,";
  const teamText = orgName ? `the <strong>${orgName}</strong> worship team` : "a worship team";

  return emailWrapper(`
    <h2 style="margin:0 0 16px;color:${BRAND_NAVY};font-size:20px">You're Invited!</h2>
    <p style="color:#374151;line-height:1.6;margin:0 0 8px">${greeting}</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 24px">
      You've been invited to join ${teamText} on <strong>VPC Music</strong>.
      Click below to get started — you'll be able to view chord charts, setlists, and more.
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${inviteUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:600;font-size:14px">
        Accept Invitation
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:24px 0 0">
      If you weren't expecting this, you can safely ignore this email.
    </p>
  `);
}

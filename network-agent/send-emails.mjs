/**
 * send-emails.mjs
 * Sends emails via Gmail using nodemailer + app password.
 * Includes rate limiting and a dry-run mode.
 */

import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;   // e.g. singhjashandeep190@gmail.com
const GMAIL_PASS = process.env.GMAIL_APP_PASS; // Google App Password (16 chars, no spaces)

function createTransport() {
  if (!GMAIL_USER || !GMAIL_PASS) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASS in environment.");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
}

/**
 * Send a single email.
 * @param {object} opts
 * @param {string} opts.to       Recipient email
 * @param {string} opts.subject  Subject line
 * @param {string} opts.body     Plain text body
 * @param {boolean} opts.dryRun  If true, log but don't send
 */
export async function sendEmail({ to, subject, body, dryRun = false }) {
  if (dryRun) {
    console.log(`[DRY RUN] To: ${to}`);
    console.log(`[DRY RUN] Subject: ${subject}`);
    console.log(`[DRY RUN] Body:\n${body}\n`);
    return { messageId: "dry-run", dryRun: true };
  }

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: `Jashandeep Singh <${GMAIL_USER}>`,
    to,
    subject,
    text: body,
  });

  return { messageId: info.messageId, dryRun: false };
}

/**
 * Send a batch of emails with rate limiting.
 * @param {Array}   emails    Array of { to, subject, body }
 * @param {object}  opts
 * @param {boolean} opts.dryRun       Don't actually send
 * @param {number}  opts.delayMs      Delay between sends (default: 3000ms)
 * @param {number}  opts.maxPerRun    Max emails to send in one run (default: 20)
 */
export async function sendBatch(emails, { dryRun = false, delayMs = 3000, maxPerRun = 20 } = {}) {
  const toSend = emails.slice(0, maxPerRun);
  const results = [];

  for (let i = 0; i < toSend.length; i++) {
    const email = toSend[i];
    try {
      const result = await sendEmail({ ...email, dryRun });
      results.push({ ...email, status: "sent", messageId: result.messageId });
      console.log(`[${i + 1}/${toSend.length}] ✅ Sent to ${email.to}`);
    } catch (err) {
      results.push({ ...email, status: "failed", error: err.message });
      console.error(`[${i + 1}/${toSend.length}] ❌ Failed to ${email.to}: ${err.message}`);
    }

    if (i < toSend.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}

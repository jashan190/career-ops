#!/usr/bin/env node
/**
 * run.mjs — Main entry point for network-agent
 *
 * Usage:
 *   node run.mjs                          # Full run: find roles + contacts + generate + review + send
 *   node run.mjs --dry-run                # Generate everything, don't send
 *   node run.mjs --company Stripe,Figma   # Target specific companies only
 *   node run.mjs --type recruiter         # Only recruiter emails (skip engineer networking)
 *   node run.mjs --type engineer          # Only networking emails
 *   node run.mjs --skip-roles             # Don't pull job board, just find contacts
 *   node run.mjs summary                  # Print outreach tracker summary
 */

import readline from "readline";
import { findRoles } from "./find-roles.mjs";
import { findContacts } from "./find-contacts.mjs";
import { generateRecruiterEmail, generateEngineerEmail, generateSubject } from "./generate-emails.mjs";
import { sendBatch } from "./send-emails.mjs";
import { logEmail, printSummary } from "./tracker.mjs";
import { COMPANIES } from "./companies.mjs";

// ── Load .env ─────────────────────────────────────────────────────────────────
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const envPath = join(import.meta.dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args[0] === "summary") { printSummary(); process.exit(0); }

const dryRun    = args.includes("--dry-run");
const skipRoles = args.includes("--skip-roles");
const typeArg   = args.find(a => a.startsWith("--type="))?.split("=")[1]
               || (args.indexOf("--type") >= 0 ? args[args.indexOf("--type") + 1] : null);
const companyArg = args.find(a => a.startsWith("--company="))?.split("=")[1]
                || (args.indexOf("--company") >= 0 ? args[args.indexOf("--company") + 1] : null);
const companyFilter = companyArg ? companyArg.split(",").map(s => s.trim()) : null;

if (!dryRun && !process.env.GMAIL_USER)     { console.error("❌ Missing GMAIL_USER in .env"); process.exit(1); }
if (!dryRun && !process.env.GMAIL_APP_PASS) { console.error("❌ Missing GMAIL_APP_PASS in .env"); process.exit(1); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n🚀 network-agent${dryRun ? " [DRY RUN]" : ""}`);
console.log(`   Companies: ${companyFilter ? companyFilter.join(", ") : "all"}`);
console.log(`   Type: ${typeArg || "both (recruiter + engineer)"}\n`);

// Step 1: Pull open roles
let rolesByCompany = {};
if (!skipRoles) {
  console.log("📋 Pulling open roles from job boards...");
  const roleResults = await findRoles(companyFilter);
  for (const { company, roles } of roleResults) {
    if (roles.length) rolesByCompany[company] = roles;
  }
  const totalRoles = Object.values(rolesByCompany).reduce((s, r) => s + r.length, 0);
  console.log(`   Found ${totalRoles} matching roles across ${Object.keys(rolesByCompany).length} companies\n`);
}

// Step 2: Find contacts + generate emails
const targets = companyFilter
  ? COMPANIES.filter(c => companyFilter.includes(c.name))
  : COMPANIES;

const emailQueue = [];

for (const company of targets) {
  console.log(`🔍 ${company.name} — finding contacts...`);

  let contacts;
  try {
    contacts = await findContacts(company.domain, company.name);
  } catch (err) {
    console.error(`   ⚠️  Contact search error: ${err.message}`);
    await delay(1000);
    continue;
  }

  console.log(`   Recruiters: ${contacts.recruiters.length} | Engineers: ${contacts.engineers.length}`);

  const roles = rolesByCompany[company.name] || [];
  const topRole = roles[0]?.title || null; // use first matching role if available

  // Recruiter emails
  if (!typeArg || typeArg === "recruiter") {
    for (const contact of contacts.recruiters.slice(0, 2)) { // max 2 recruiters per company
      process.stdout.write(`   ✍️  Generating recruiter email for ${contact.name}...`);
      try {
        const body    = await generateRecruiterEmail(company.name, contact.name, topRole);
        const subject = await generateSubject(body, company.name, "recruiter");
        emailQueue.push({ to: contact.email, subject, body, company: company.name, name: contact.name, type: "recruiter" });
        console.log(" done");
      } catch (err) {
        console.log(` ❌ ${err.message}`);
      }
      await delay(500);
    }
  }

  // Engineer networking emails
  if (!typeArg || typeArg === "engineer") {
    for (const contact of contacts.engineers.slice(0, 2)) { // max 2 engineers per company
      process.stdout.write(`   ✍️  Generating networking email for ${contact.name}...`);
      try {
        const body    = await generateEngineerEmail(company.name, contact.name, contact.title);
        const subject = await generateSubject(body, company.name, "networking");
        emailQueue.push({ to: contact.email, subject, body, company: company.name, name: contact.name, type: "engineer" });
        console.log(" done");
      } catch (err) {
        console.log(` ❌ ${err.message}`);
      }
      await delay(500);
    }
  }

  await delay(1200); // be nice to Hunter.io rate limits
}

console.log(`\n📬 Email queue: ${emailQueue.length} emails ready\n`);
if (!emailQueue.length) { console.log("Nothing to send. Exiting."); process.exit(0); }

// Step 3: Review queue before sending
console.log("── Preview ──────────────────────────────────────────────────────");
for (let i = 0; i < emailQueue.length; i++) {
  const e = emailQueue[i];
  console.log(`\n[${i + 1}] ${e.type.toUpperCase()} → ${e.name} at ${e.company} <${e.to}>`);
  console.log(`Subject: ${e.subject}`);
  console.log(`\n${e.body}`);
  console.log("\n─────────────────────────────────────────────────────────────");
}

const confirm = dryRun
  ? "y"
  : await prompt(`\nSend all ${emailQueue.length} emails? [y/N] `);

if (confirm.toLowerCase() !== "y") {
  console.log("Aborted. No emails sent.");
  process.exit(0);
}

// Step 4: Send
console.log("\n📤 Sending...\n");
const results = await sendBatch(emailQueue, { dryRun, delayMs: 3000, maxPerRun: 30 });

// Step 5: Log
for (const r of results) {
  logEmail({
    company: r.company,
    name:    r.name,
    email:   r.to,
    type:    r.type,
    subject: r.subject,
    status:  r.status,
  });
}

// Summary
const sent   = results.filter(r => r.status === "sent").length;
const failed = results.filter(r => r.status === "failed").length;
console.log(`\n✅ Done. Sent: ${sent} | Failed: ${failed}`);
console.log(`📊 Log: network-agent/data/outreach-log.csv`);
console.log(`   Run "node run.mjs summary" to see reply tracking.`);

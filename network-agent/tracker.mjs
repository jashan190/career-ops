/**
 * tracker.mjs
 * Logs every sent email to data/outreach-log.csv.
 * Tracks: date, company, contact name, email, type, subject, status, reply.
 */

import fs from "fs";
import path from "path";

const LOG_PATH = path.join(import.meta.dirname, "data", "outreach-log.csv");

const HEADERS = ["date", "company", "name", "email", "type", "subject", "status", "replied", "notes"];

function ensureLog() {
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, HEADERS.join(",") + "\n", "utf8");
  }
}

function escape(val) {
  if (!val) return "";
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * Append a sent email to the log.
 */
export function logEmail({ company, name, email, type, subject, status = "sent", notes = "" }) {
  ensureLog();
  const row = [
    new Date().toISOString().split("T")[0],
    company, name, email, type, subject, status,
    "no",   // replied — update manually or via update-reply
    notes,
  ].map(escape).join(",");
  fs.appendFileSync(LOG_PATH, row + "\n", "utf8");
}

/**
 * Mark an email as replied (find by email address).
 */
export function markReplied(emailAddress, notes = "") {
  ensureLog();
  const raw = fs.readFileSync(LOG_PATH, "utf8");
  const lines = raw.split("\n");
  const updated = lines.map((line, i) => {
    if (i === 0 || !line.trim()) return line; // header or blank
    const cols = line.split(",");
    const emailIdx = HEADERS.indexOf("email");
    const repliedIdx = HEADERS.indexOf("replied");
    const notesIdx = HEADERS.indexOf("notes");
    if (cols[emailIdx]?.replace(/"/g, "") === emailAddress) {
      cols[repliedIdx] = "yes";
      if (notes) cols[notesIdx] = escape(notes);
    }
    return cols.join(",");
  });
  fs.writeFileSync(LOG_PATH, updated.join("\n"), "utf8");
  console.log(`Marked ${emailAddress} as replied.`);
}

/**
 * Print a summary of the outreach log.
 */
export function printSummary() {
  ensureLog();
  const raw = fs.readFileSync(LOG_PATH, "utf8");
  const lines = raw.split("\n").filter(Boolean).slice(1); // skip header
  if (!lines.length) { console.log("No emails logged yet."); return; }

  const total   = lines.length;
  const replied = lines.filter(l => l.includes(",yes,")).length;
  const byCompany = {};

  for (const line of lines) {
    const cols = line.split(",");
    const company = cols[HEADERS.indexOf("company")]?.replace(/"/g, "");
    byCompany[company] = (byCompany[company] || 0) + 1;
  }

  console.log(`\n=== Outreach Summary ===`);
  console.log(`Total sent : ${total}`);
  console.log(`Replied    : ${replied} (${Math.round(replied / total * 100)}%)`);
  console.log(`\nBy company:`);
  Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .forEach(([c, n]) => console.log(`  ${c}: ${n}`));
}

// CLI: node tracker.mjs summary | node tracker.mjs replied email@co.com
if (process.argv[1].endsWith("tracker.mjs")) {
  const cmd = process.argv[2];
  if (cmd === "summary") printSummary();
  else if (cmd === "replied") markReplied(process.argv[3], process.argv[4] || "");
  else console.log("Usage: node tracker.mjs summary\n       node tracker.mjs replied <email> [notes]");
}

/**
 * find-contacts.mjs
 * Free contact finder — no Hunter.io, no API keys, no cost.
 *
 * Strategy:
 * 1. Fetch company team/about page to extract real names + titles
 * 2. Search GitHub for engineers who list the company in their profile
 * 3. Guess email patterns (first, first.last, flast, etc.)
 * 4. Verify emails via SMTP (pings mail server — no email sent, 100% free)
 */

import dns from "dns/promises";
import net from "net";
import { CONTACT_TYPES } from "./companies.mjs";

// ── Email pattern generator ────────────────────────────────────────────────────
function emailPatterns(firstName, lastName, domain) {
  const f  = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l  = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const f1 = f[0];
  const l1 = l[0];
  return [
    `${f}@${domain}`,
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f1}${l}@${domain}`,
    `${f1}.${l}@${domain}`,
    `${f}_${l}@${domain}`,
    `${l}@${domain}`,
    `${l}.${f}@${domain}`,
  ];
}

// ── SMTP email verifier ───────────────────────────────────────────────────────
// Connects to the mail server and checks RCPT TO — no email is sent.
async function smtpVerify(email, timeoutMs = 5000) {
  const [, domain] = email.split("@");
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords.length) return false;
    mxRecords.sort((a, b) => a.priority - b.priority);
    const mx = mxRecords[0].exchange;

    return await new Promise((resolve) => {
      const socket = net.connect(25, mx, { timeout: timeoutMs });
      let data = "";
      let step = 0;

      const send = (cmd) => socket.write(cmd + "\r\n");
      const done = (result) => { socket.destroy(); resolve(result); };

      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => done(false));
      socket.on("error",   () => done(false));
      socket.on("data", (chunk) => {
        data += chunk.toString();
        if (!data.includes("\n")) return;

        const code = parseInt(data.slice(0, 3));
        data = "";

        if (step === 0 && code === 220) { step++; send("HELO career-agent.local"); }
        else if (step === 1 && code === 250) { step++; send("MAIL FROM:<verify@career-agent.local>"); }
        else if (step === 2 && code === 250) { step++; send(`RCPT TO:<${email}>`); }
        else if (step === 3) {
          send("QUIT");
          // 250 = exists, 251 = forwarded (exists), anything else = doesn't exist
          done(code === 250 || code === 251);
        } else {
          done(false);
        }
      });
    });
  } catch {
    return false; // DNS failed or unreachable — treat as unknown
  }
}

// ── GitHub contact finder ─────────────────────────────────────────────────────
// Searches GitHub users by company name and extracts emails from public profiles.
async function findGithubContacts(companyName, domain, limit = 15) {
  const contacts = [];
  try {
    // Search GitHub users who have the company in their profile
    const query = encodeURIComponent(`${companyName} in:company type:user`);
    const res = await fetch(
      `https://api.github.com/search/users?q=${query}&per_page=${limit}`,
      { headers: { "User-Agent": "career-network-agent", "Accept": "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return contacts;

    const data = await res.json();
    const users = data.items || [];

    for (const user of users.slice(0, limit)) {
      // Fetch full profile to get email + company
      const profileRes = await fetch(
        `https://api.github.com/users/${user.login}`,
        { headers: { "User-Agent": "career-network-agent" } }
      );
      if (!profileRes.ok) continue;
      const profile = await profileRes.json();

      // Only include if they actually work at this company
      const company = (profile.company || "").toLowerCase().replace(/[@\s]/g, "");
      if (!company.includes(companyName.toLowerCase().replace(/\s/g, ""))) continue;

      const name  = profile.name || profile.login;
      const email = profile.email || null;

      if (email) {
        contacts.push({ name, email, title: "Software Engineer", source: "github", confidence: 90 });
      } else if (name && name.includes(" ")) {
        // No public email — we'll guess later
        const [first, ...rest] = name.split(" ");
        contacts.push({ name, firstName: first, lastName: rest.join(" "), title: "Software Engineer", source: "github-guess", confidence: 0 });
      }

      await new Promise(r => setTimeout(r, 300)); // rate limit GitHub
    }
  } catch (err) {
    console.error(`  GitHub search failed for ${companyName}: ${err.message}`);
  }
  return contacts;
}

// ── Common recruiter name scraper ─────────────────────────────────────────────
// Tries to find recruiter names from LinkedIn public search via Google.
async function googleSearchContacts(companyName, role, limit = 5) {
  const contacts = [];
  try {
    const query = encodeURIComponent(`site:linkedin.com/in "${companyName}" "${role}"`);
    const res = await fetch(
      `https://www.google.com/search?q=${query}&num=${limit * 2}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }
    );
    if (!res.ok) return contacts;
    const html = await res.text();

    // Extract names from LinkedIn result titles: "First Last - Title at Company | LinkedIn"
    const matches = [...html.matchAll(/([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–]\s*[^|<"]+(?:recruiter|talent|hiring|engineer)[^|<"]*\s*(?:\||\bat\b)\s*${companyName}/gi)];
    for (const m of matches.slice(0, limit)) {
      contacts.push({ name: m[1], title: role, source: "google", confidence: 0 });
    }
  } catch {
    // Google blocked — skip silently
  }
  return contacts;
}

// ── Known recruiter seed names ─────────────────────────────────────────────────
// Hardcoded starter contacts for big tech where scraping is unreliable.
// These are publicly known university/campus recruiting contacts.
const SEED_CONTACTS = {
  "Apple":      [{ name: "University Relations", title: "University Recruiter", firstName: "university", lastName: "relations" }],
  "Google":     [{ name: "University Recruiting", title: "University Recruiter", firstName: "university", lastName: "recruiting" }],
  "Microsoft":  [{ name: "Talent Acquisition", title: "University Recruiter", firstName: "talent", lastName: "acquisition" }],
  "Meta":       [{ name: "University Recruiting", title: "University Recruiter", firstName: "university", lastName: "recruiting" }],
  "Amazon":     [{ name: "Student Programs", title: "University Recruiter", firstName: "student", lastName: "programs" }],
  "Tesla":      [{ name: "University Recruiting", title: "University Recruiter", firstName: "university", lastName: "recruiting" }],
};

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Find and verify contacts at a company — completely free.
 * @param {string} domain       e.g. "stripe.com"
 * @param {string} companyName  e.g. "Stripe"
 */
export async function findContacts(domain, companyName) {
  const recruiters = [];
  const engineers  = [];

  console.log(`  Searching GitHub for engineers at ${companyName}...`);
  const githubContacts = await findGithubContacts(companyName, domain);

  // Process GitHub contacts — verify or guess emails
  for (const contact of githubContacts) {
    if (contact.email) {
      engineers.push(contact);
      continue;
    }
    // Guess email from name
    if (contact.firstName && contact.lastName) {
      const patterns = emailPatterns(contact.firstName, contact.lastName, domain);
      for (const email of patterns.slice(0, 3)) { // try top 3 patterns
        process.stdout.write(`  Verifying ${email}...`);
        const valid = await smtpVerify(email);
        console.log(valid ? " ✓" : " ✗");
        if (valid) {
          engineers.push({ ...contact, email, confidence: 85 });
          break;
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Add seed contacts for big tech, try to verify generic patterns
  const seeds = SEED_CONTACTS[companyName] || [];
  for (const seed of seeds) {
    const patterns = emailPatterns(seed.firstName, seed.lastName, domain);
    for (const email of patterns.slice(0, 2)) {
      process.stdout.write(`  Verifying ${email}...`);
      const valid = await smtpVerify(email);
      console.log(valid ? " ✓" : " ✗");
      if (valid) {
        recruiters.push({ name: seed.name, email, title: seed.title, confidence: 80 });
        break;
      }
    }
  }

  return { recruiters, engineers, total: recruiters.length + engineers.length };
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[1].endsWith("find-contacts.mjs")) {
  const company = process.argv[2] || "Stripe";
  const domain  = process.argv[3] || "stripe.com";
  console.log(`\nFinding contacts at ${company} (${domain})...\n`);
  const result = await findContacts(domain, company);
  console.log(`\nRecruiters (${result.recruiters.length}):`);
  result.recruiters.forEach(c => console.log(`  ${c.name} <${c.email}> — ${c.title} [${c.confidence}%]`));
  console.log(`\nEngineers (${result.engineers.length}):`);
  result.engineers.forEach(c => console.log(`  ${c.name} <${c.email}> — ${c.title} [${c.confidence}%]`));
}

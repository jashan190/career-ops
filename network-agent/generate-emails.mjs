/**
 * generate-emails.mjs
 * Generates cold emails using templates — no API calls, no cost.
 * Templates are built around Jashandeep's profile and randomized for variety.
 */

// ── Profile constants (pulled from profile.md) ────────────────────────────────
const PROFILE = {
  name:       "Jashandeep Singh",
  school:     "UC Davis",
  degree:     "CS",
  grad:       "2027",
  gpa:        "3.5",
  email:      "singhjashandeep190@gmail.com",
  github:     "github.com/jashandeep-sohi", // update if different
  highlights: [
    "interned at Intel building LLM inference testing infra — cut cycle time 80% across NPU/GPU/CPU backends",
    "built an offline AI inference pipeline at a startup that runs 3-4x faster than single-pass and saves ~$1K/month in API costs",
    "shipped Manaakhah, a live halal business directory with a 75-route backend, auth/2FA, and an automated scraper pulling 800+ listings",
  ],
  skills:    "Python, TypeScript, C++, FastAPI, React, Docker, OpenVINO, ONNX Runtime",
  target:    "fall 2026 SWE internship or new grad 2027",
};

const SIGN_OFF = `${PROFILE.name} | UC Davis CS '${PROFILE.grad} | ${PROFILE.email}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Recruiter / Hiring Manager emails ─────────────────────────────────────────
const RECRUITER_OPENERS = [
  (company) => `I came across ${company}'s open roles and wanted to reach out directly.`,
  (company) => `I've been following ${company}'s work and wanted to put myself on your radar.`,
  (company, role) => role
    ? `I saw the ${role} role at ${company} and wanted to reach out before applying.`
    : `I'm targeting ${company} for my next role and figured a direct message beats the black hole.`,
];

const RECRUITER_BODIES = [
  () => `Last summer at Intel I built production LLM inference testing infra that cut validation cycle time by 80% across NPU, GPU, and CPU backends — 100+ daily runs in prod. Since then I've been at a startup building offline AI inference pipelines that run 3-4x faster than baseline and cut ~$1K/month in API costs. UC Davis CS, 3.5 GPA, graduating 2027.`,
  () => `Quick background: Intel SWE intern (LLM inference infra, 80% cycle time reduction), now at a startup shipping offline AI inference in production. I also built Manaakhah — a live directory with a 75-route backend and automated scraper — on the side. Strong in Python, TypeScript, C++, FastAPI, and ML infra tooling.`,
  () => `I interned at Intel last summer on LLM inference testing (NPU/GPU/CPU, 100+ daily validation runs) and I'm currently at a startup where I own the full AI inference pipeline. UC Davis CS '27, 3.5 GPA. I work across the stack but my strongest lane is backend and ML systems.`,
];

const RECRUITER_ASKS = [
  (target) => `I'm looking for a ${target}. Is there a process I should follow, or is there someone better to connect with on this?`,
  (target) => `I'm targeting a ${target}. Happy to share more — would a quick chat make sense?`,
  (target) => `Would love to know if there's a fit for a ${target}. What's the best next step?`,
];

export function generateRecruiterEmail(company, contactName, role = null) {
  const firstName = contactName?.split(" ")[0] || null;
  const opener    = pick(RECRUITER_OPENERS)(company, role);
  const body      = pick(RECRUITER_BODIES)();
  const ask       = pick(RECRUITER_ASKS)(PROFILE.target);

  const lines = [
    firstName ? `Hi ${firstName},` : "Hi,",
    "",
    opener,
    "",
    body,
    "",
    ask,
    "",
    SIGN_OFF,
  ];

  return lines.join("\n");
}

// ── Engineer networking emails ─────────────────────────────────────────────────
const ENGINEER_OPENERS = [
  (name, company) => `I came across your profile while researching ${company} — your work caught my attention and I wanted to reach out.`,
  (name, company) => `I've been looking into ${company}'s engineering org and your name came up — hope a cold message is okay.`,
  (name, company) => `Found you while digging into ${company}'s team. Not pitching anything — just genuinely interested in your work.`,
];

const ENGINEER_BODIES = [
  (company) => `I'm a CS student at UC Davis (graduating 2027) with internship experience at Intel building LLM inference infra and currently working at a startup on offline AI pipelines. I'm trying to understand what engineering actually looks like at companies like ${company} — the tooling, the tradeoffs, what makes it different from what I read online.`,
  (company) => `Background: Intel SWE intern on ML inference testing, now building production AI systems at a startup. UC Davis CS, grad 2027. I'm at the point where I'm thinking seriously about where I want to grow as an engineer, and ${company} keeps coming up as a place people say "you'll learn a lot there."`,
  (company) => `I'm a UC Davis CS student who's worked on LLM inference at Intel and offline AI pipelines at a startup. I'm genuinely curious about the engineering culture at ${company} — specifically what problems the team is focused on and what it's like to ramp up there.`,
];

const ENGINEER_ASKS = [
  () => `Would you be open to a 20-minute call sometime? No agenda — I just want to hear your honest take.`,
  () => `If you have 20 minutes, I'd love to hear your perspective. No ask on my end — just trying to learn.`,
  () => `If you're open to it, even a quick 15-minute chat would be genuinely useful for me.`,
];

export function generateEngineerEmail(company, contactName, contactTitle) {
  const firstName = contactName?.split(" ")[0] || null;
  const opener    = pick(ENGINEER_OPENERS)(firstName || "you", company);
  const body      = pick(ENGINEER_BODIES)(company);
  const ask       = pick(ENGINEER_ASKS)();

  const lines = [
    firstName ? `Hi ${firstName},` : "Hi,",
    "",
    opener,
    "",
    body,
    "",
    ask,
    "",
    SIGN_OFF,
  ];

  return lines.join("\n");
}

// ── Subject lines ─────────────────────────────────────────────────────────────
const RECRUITER_SUBJECTS = [
  (company, role) => role ? `${role} — UC Davis CS '27` : `SWE Intern / New Grad 2027 — ${company}`,
  (company, role) => role ? `Interested in ${role} at ${company}` : `Reaching out — SWE roles at ${company}`,
  (company)       => `Intel → Startup → ${company}?`,
];

const ENGINEER_SUBJECTS = [
  (company) => `Engineering at ${company} — quick question`,
  (company) => `Curious about your work at ${company}`,
  (company) => `UC Davis CS student — learning about ${company}`,
];

export function generateSubject(emailBody, company, type, role = null) {
  if (type === "recruiter") return pick(RECRUITER_SUBJECTS)(company, role);
  return pick(ENGINEER_SUBJECTS)(company);
}

// ── CLI test ──────────────────────────────────────────────────────────────────
if (process.argv[1].endsWith("generate-emails.mjs")) {
  console.log("=== Recruiter Email (Stripe, with role) ===\n");
  const rBody    = generateRecruiterEmail("Stripe", "Sarah Johnson", "Software Engineer Intern");
  const rSubject = generateSubject(rBody, "Stripe", "recruiter", "Software Engineer Intern");
  console.log(`Subject: ${rSubject}\n\n${rBody}`);

  console.log("\n\n=== Engineer Networking Email (Figma) ===\n");
  const eBody    = generateEngineerEmail("Figma", "Alex Chen", "Senior Software Engineer");
  const eSubject = generateSubject(eBody, "Figma", "engineer");
  console.log(`Subject: ${eSubject}\n\n${eBody}`);
}

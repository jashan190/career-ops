// Company registry — domain + job board slug + board type
// board types: 'greenhouse', 'lever', 'custom', 'none'

export const COMPANIES = [
  { name: "NVIDIA",       domain: "nvidia.com",       board: "greenhouse", slug: "nvidia" },
  { name: "Figma",        domain: "figma.com",         board: "greenhouse", slug: "figma" },
  { name: "Stripe",       domain: "stripe.com",        board: "greenhouse", slug: "stripe" },
  { name: "Cloudflare",   domain: "cloudflare.com",    board: "greenhouse", slug: "cloudflare" },
  { name: "Anduril",      domain: "anduril.com",       board: "greenhouse", slug: "anduril-industries" },
  { name: "Verkada",      domain: "verkada.com",       board: "greenhouse", slug: "verkada" },
  { name: "Twilio",       domain: "twilio.com",        board: "greenhouse", slug: "twilio" },
  { name: "Rivian",       domain: "rivian.com",        board: "greenhouse", slug: "rivian" },
  { name: "Databricks",   domain: "databricks.com",    board: "greenhouse", slug: "databricks" },
  { name: "Snowflake",    domain: "snowflake.com",     board: "greenhouse", slug: "snowflake" },
  { name: "Coinbase",     domain: "coinbase.com",      board: "greenhouse", slug: "coinbase" },
  { name: "Palantir",     domain: "palantir.com",      board: "lever",      slug: "palantir" },
  { name: "OpenAI",       domain: "openai.com",        board: "greenhouse", slug: "openai" },
  { name: "Anthropic",    domain: "anthropic.com",     board: "greenhouse", slug: "anthropic" },
  // Big tech — careers pages are proprietary, we skip job pull but still do contact outreach
  { name: "Apple",        domain: "apple.com",         board: "none",       slug: null },
  { name: "Google",       domain: "google.com",        board: "none",       slug: null },
  { name: "Microsoft",    domain: "microsoft.com",     board: "none",       slug: null },
  { name: "Meta",         domain: "meta.com",          board: "none",       slug: null },
  { name: "Amazon",       domain: "amazon.com",        board: "none",       slug: null },
  { name: "Tesla",        domain: "tesla.com",         board: "none",       slug: null },
];

// Role keywords that match Jashan's targets
export const ROLE_KEYWORDS = [
  "software engineer intern",
  "swe intern",
  "software engineer",
  "backend engineer",
  "infrastructure engineer",
  "ml engineer",
  "systems engineer",
  "full stack",
  "new grad",
  "university grad",
];

// Contact types to search for per company
export const CONTACT_TYPES = {
  recruiter: {
    titles: ["recruiter", "talent", "hiring", "university recruiting", "campus"],
    emailType: "recruiter",
  },
  engineer: {
    titles: ["software engineer", "senior engineer", "staff engineer", "engineering manager"],
    emailType: "network",
  },
};

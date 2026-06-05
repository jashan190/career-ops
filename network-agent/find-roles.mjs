/**
 * find-roles.mjs
 * Pull open SWE roles from Greenhouse and Lever job boards (no auth required).
 * Returns matching roles per company filtered by ROLE_KEYWORDS.
 */

import { COMPANIES, ROLE_KEYWORDS } from "./companies.mjs";

const GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards";
const LEVER_API      = "https://api.lever.co/v0/postings";

function matchesRole(title) {
  const t = title.toLowerCase();
  return ROLE_KEYWORDS.some(k => t.includes(k));
}

async function fetchGreenhouse(slug) {
  try {
    const res = await fetch(`${GREENHOUSE_API}/${slug}/jobs?content=false`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || [])
      .filter(j => matchesRole(j.title))
      .map(j => ({ title: j.title, url: j.absolute_url, id: j.id }));
  } catch {
    return [];
  }
}

async function fetchLever(slug) {
  try {
    const res = await fetch(`${LEVER_API}/${slug}?mode=json`);
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter(j => matchesRole(j.text))
      .map(j => ({ title: j.text, url: j.hostedUrl, id: j.id }));
  } catch {
    return [];
  }
}

export async function findRoles(companyFilter = null) {
  const targets = companyFilter
    ? COMPANIES.filter(c => companyFilter.includes(c.name))
    : COMPANIES;

  const results = [];

  for (const company of targets) {
    let roles = [];
    if (company.board === "greenhouse") {
      roles = await fetchGreenhouse(company.slug);
    } else if (company.board === "lever") {
      roles = await fetchLever(company.slug);
    }
    // board === 'none' → big tech with custom portals, no API
    results.push({ company: company.name, domain: company.domain, roles });
  }

  return results;
}

// CLI: node find-roles.mjs [CompanyName,...]
if (process.argv[1].endsWith("find-roles.mjs")) {
  const filter = process.argv[2] ? process.argv[2].split(",") : null;
  const results = await findRoles(filter);
  for (const r of results) {
    console.log(`\n=== ${r.company} (${r.roles.length} matching roles) ===`);
    for (const role of r.roles) {
      console.log(`  • ${role.title}`);
      console.log(`    ${role.url}`);
    }
  }
}

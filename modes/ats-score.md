# Mode: ats-score — Candidate ATS Self-Score

Trigger: user asks how an ATS would score their resume, "score my resume", "run the ATS scorer", "candidate score", "ats score".

This mode is the mirror image of `oferta.md`. `oferta.md` scores how well a JOB fits the candidate. This mode scores how well the CANDIDATE'S resume would survive automated ATS screening -- useful for finding and fixing gaps in `cv.md` before applying, not for deciding whether to apply.

## Attribution

The scoring rubric below is adapted from HackerRank's open-source ATS, [`hiring-agent`](https://github.com/interviewstreet/hiring-agent) (MIT licensed) -- specifically its `resume_evaluation_criteria.jinja` and `resume_evaluation_system_message.jinja` prompts, which HackerRank built to evaluate resumes on the company side. career-ops repurposes the same scoring logic candidate-side: instead of a company scoring the candidate, the candidate scores themselves first, so the gaps a real ATS would penalize get fixed before a real ATS ever sees the resume.

## Inputs

1. Read `cv.md` (canonical resume -- never hardcode metrics, read them live)
2. Read `article-digest.md` if it exists (extra proof points)
3. Read `config/profile.yml` for `narrative.proof_points` -- these carry project URLs needed for the link-quality scoring below
4. If a GitHub URL is present (`config/profile.yml` `candidate.github`, or in `cv.md`), check the public GitHub profile (WebSearch/WebFetch, or `gh api users/{username}/repos` if `gh` is available) for contributions to OTHER people's repositories, not just self-owned ones -- this is the single biggest lever in the rubric below

## Fairness constraint

Scores must **never** depend on: name, gender, college/university name, GPA, city/location, or any other demographic signal. Score only on: technical skills, project complexity/impact, open source contributions, production/work experience, and technical communication. If a finding would be excluded by this rule (e.g. "went to a good school"), do not use it as evidence for any category.

## Scoring rubric

### Open Source (0-35 pts) -- the single biggest category

- **25-35:** contributions to popular projects (1,000+ stars), or GSoC-caliber program participation
- **15-24:** contributions to smaller external projects, active GitHub presence with commits to OTHER people's repos
- **5-10:** only personal/self-owned repos, minimal external contribution
- **0-4:** no GitHub presence, or only tutorial-style repos

**Hard rule:** personal repositories are NOT open source contribution. If every repo in the candidate's GitHub activity is self-owned, this category is capped at 10 regardless of how polished those repos are.

### Self Projects (0-30 pts)

- **20-30:** complex, real-world impact, advanced architecture, live users/adoption
- **10-19:** some complexity, good documentation, multiple features
- **1-9:** simple/tutorial-tier (todo apps, calculators, basic CRUD, weather apps, note apps)
- **0:** no projects, or only trivial ones

**Link penalty (apply per project, then aggregate):**
- No GitHub link or live demo at all: -30% to -50%
- GitHub link but broken: -20% to -30%
- Working live demo: +10% to +20%

### Production (0-25 pts)

Work, internship, or volunteer experience with real-world or production impact. Give extra weight to founder/co-founder roles or early-employee roles (first 10-20 people) at a startup -- these demonstrate initiative and ownership that a standard internship doesn't.

### Technical Skills (0-10 pts)

Breadth and depth shown in the skills list, languages used, and problem-solving evidence surfaced across projects and work experience.

### Bonus (max +20 total, hard cap)

- +5 GSoC or equivalent flagship open-source program participation
- +3 other recognized OSS program (e.g. Outreachy, Season of Docs)
- +3 to +5 startup founder/co-founder experience
- +2 to +3 early-stage engineer (first 10-20 employees)
- +2 portfolio site or GitHub URL listed on the resume
- +1 LinkedIn listed
- +1 to +3 quality technical writing (blog/published articles), if any exists

### Deductions

- -2 to -5 if the resume contains only tutorial-tier projects
- -1 to -3 for each simple project beyond the first
- -1 for generic project names ("Calculator", "Todo App", "Weather App")
- -3 to -5 per project with zero link (no GitHub, no live demo)
- -2 to -3 per project with a GitHub link but no live demo

**Total cap: 120 points** (100 from the four categories + 20 bonus, deductions subtracted after).

## Output format

```markdown
## ATS Self-Score — {YYYY-MM-DD}

| Category | Score | Max | Evidence |
|---|---|---|---|
| Open Source | X | 35 | ... |
| Self Projects | X | 30 | ... |
| Production | X | 25 | ... |
| Technical Skills | X | 10 | ... |

**Bonus:** +X — {breakdown}
**Deductions:** -X — {reasons}
**Total:** X / 120

**Key strengths** (max 5, evidence-backed)
1. ...

**Areas for improvement** (max 3, concrete and actionable -- e.g. "Add a live demo link to Manaakhah," not "improve projects")
1. ...
```

## Post-scoring

Append the run to `interview-prep/ats-score.md` (create if missing) -- do not overwrite prior runs. This builds a dated history so the candidate can see the score trend as `cv.md` improves over time, the same pattern `interview-prep/story-bank.md` uses for STAR+R stories.

Do not write anything to `data/applications.md` or `reports/` -- this mode scores the candidate, not a specific job offer, so it does not belong in the job pipeline or tracker.

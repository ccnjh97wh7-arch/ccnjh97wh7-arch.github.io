---
name: website-improvement
description: 'Continuously audit and improve this static website (ccnjh97wh7-arch.github.io) like an employee assigned ongoing site-maintenance duties. Use when asked to "improve the site", "do a site audit", "find issues to fix", "clean up pages", or work through a backlog of navigation/accessibility/consistency/performance problems. Covers nav consistency, aria-current, href path style, cache-busting versions, broken links/images, and JSON data integrity.'
argument-hint: 'Optional: a specific page or area to focus on (e.g. "photos.html" or "navigation")'
---

# Website Improvement (Ongoing Maintenance)

Acts like a site-reliability/maintenance employee: find a small, low-risk issue, fix it, verify it, log it, move to the next. Prefer many small safe commits over one large risky rewrite.

## When to Use
- User asks to improve, clean up, audit, or maintain the site generally (no specific bug reported).
- Working through the standing backlog of known issues (see below).
- Periodic "what should we fix next" check-ins.

## Before Starting
1. Read [/memories/repo/notes.md](/memories/repo/notes.md) for prior audit findings and site conventions already recorded — do not duplicate work already noted as done.
2. If the user names a specific page/area, scope the work to it. Otherwise pick the highest-impact open item from the backlog below.

## Standing Backlog (update as items are fixed)
Source of truth: the "Site-wide Audit Findings" section in repo memory. Known categories to check across all top-level `*.html` pages:

1. **Navigation consistency** — every page should use the same nav component/classes and the same full link set (Home, Music, Photos, Merch, Baseball Cards, More Images, Updates, etc.). Flag pages with custom nav markup or missing items.
2. **`aria-current="page"`** — the nav link matching the current page should have `aria-current="page"` for accessibility.
3. **Href path style** — links should be bare (`href="index.html"`), not `./`-prefixed, for consistency; fix mixed patterns within a single page too.
4. **CSS cache-busting versions** — `style.css` query strings (`?v=...`) should match the current version used by the newest pages (check [index.html](../../../index.html) for the latest); stale versions should be bumped or removed to match convention.
5. **Broken links/images** — check `href`/`src` targets resolve to real files in the repo; check JSON data files (`*.json`) referenced by pages have matching keys/fields the page expects.
6. **Duplicate/dead code** — leftover inline styles or scripts that duplicate `style.css` rules, or unused localStorage keys no longer read anywhere.

## Procedure
1. **Pick one issue** from the backlog (or user-specified scope). Don't try to fix everything in one pass.
2. **Grep across pages** to find every page affected (e.g. `grep_search` for `class="site-bar"` or `href="\./` ) so the fix is applied consistently everywhere, not just one file.
3. **Fix it** with minimal, targeted edits — match the existing convention found on the most up-to-date/reference page (usually [index.html](../../../index.html)) rather than inventing a new pattern.
4. **Verify**: re-run the grep to confirm no other pages regressed, and use `get_errors` on edited files.
5. **Log it**: append a one-line, dated entry to `/memories/repo/notes.md` describing what was fixed and which files changed, so future sessions don't redo the audit.
6. **Report back** briefly: what was found, what was fixed, what's still open in the backlog.

## Guardrails
- Never push or force-push; only make local edits unless the user asks to commit/push.
- Don't restyle or refactor pages beyond the specific issue being fixed.
- Prefer fixing all instances of one issue type across the site before moving to the next issue type (batch by category, not by page).

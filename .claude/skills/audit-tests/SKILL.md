---
name: audit-tests
description: Runs the repo's built-in test auditor (agents/test-auditor.js) to evaluate test quality and find anti-patterns. Use this skill whenever the user wants to check test health, find brittle or broken tests, audit test anti-patterns, get a test quality report, or see which test files have issues like missing assertions, .only/.skip, hard-coded timeouts, or swallowed errors. Triggers on phrases like "audit tests", "check test quality", "run test auditor", "find test anti-patterns", "test health report", "which tests have issues", "evaluate tests".
---

This skill runs `agents/test-auditor.js` — a static analyzer that scans every Jest and Playwright test file in the repo for anti-patterns and produces a scored health report.

## What the auditor checks

| Severity | Anti-pattern | Why it matters |
|---|---|---|
| 🔴 Critical | Test block without assertions | A test that never calls `expect()` can never fail — it proves nothing |
| 🔴 Critical | Focused test (`.only`) | Silently skips all other tests in CI |
| 🔴 Critical | `setTimeout()` inside test | Causes flakiness; use `jest.useFakeTimers()` instead |
| 🔴 Critical | Hard-coded `waitForTimeout` (Playwright) | Flaky on slow machines; use auto-waiting instead |
| 🟡 Warning | Skipped test (`.skip` / `xit` / `xdescribe`) | Rots silently and misleads coverage metrics |
| 🟡 Warning | `console.log` left in | Adds noise to CI output |
| 🟡 Warning | Tautological assertion (`expect(true).toBe(true)`) | Always passes — not testing real code |
| 🟡 Warning | `beforeAll` without matching `afterAll` | Leaks DB connections, servers, or state |
| 🟡 Warning | Empty `catch` block swallowing errors | Hides failures silently |
| 🟡 Warning | Hard-coded absolute URL in `page.goto()` | Breaks when environment changes |
| 🔵 Info | Magic timeout constant (≥ 1000 ms inline) | Should be a named constant |
| 🔵 Info | TODO / FIXME comment | Track as a GitHub issue instead |

Scoring: each file starts at 100. Critical issues deduct 15 pts, warnings 7 pts, info 2 pts. Grade: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F < 40.

## Step 1: Decide scope

Ask the user (or infer from context):
- **Whole repo** (default) — scans everything except `node_modules`, `coverage`, `dist`
- **Specific directory** — e.g. `controllers/`, `tests/integration/`, `client/src/`
- **Save report to file?** — useful for sharing or committing

## Step 2: Run the auditor

**Whole repo, print to console:**
```bash
node agents/test-auditor.js
```

**Specific directory:**
```bash
node agents/test-auditor.js controllers/
```

**Save report to a markdown file:**
```bash
node agents/test-auditor.js --output=test-health-report.md
```

**Both directory and output file:**
```bash
node agents/test-auditor.js controllers/ --output=test-health-report.md
```

The script exits with code **0** if no critical issues are found, and **1** if any critical issues exist — making it suitable as a CI gate.

Or use the npm scripts already wired up in `package.json`:
```bash
npm run audit:tests           # prints to console
npm run audit:tests:report    # saves to a file
```

## Step 3: Interpret the output

The report has three sections:

1. **Overall Health Score** — a 0–100 score averaged across all files, with a letter grade. Share this with the user upfront.

2. **Most Frequent Anti-Patterns** — the top recurring issues across the whole repo. These are the highest-leverage things to fix.

3. **File-by-File Breakdown** — each file sorted from worst to best score. Each issue shows: severity, line number, the offending code snippet, and a suggested fix.

After running, summarize for the user:
- Overall score and grade
- Count of critical / warning / info issues
- The 2–3 worst files (lowest scores)
- The most common anti-pattern

## Step 4: Triage issues with the user

Present the findings and ask what they'd like to do:

- **Fix critical issues now** — no-assertions tests, `.only` left in, etc. These are highest priority.
- **Fix all issues in a specific file** — focus on one file at a time.
- **Open a PR with fixes** — use the `test-pr` skill to create a branch + PR with the fixes applied.
- **Just review the report** — no action needed, user wanted visibility.

## Step 5: Fix issues (if requested)

For each issue, apply the suggested fix from the report. Common fixes:

**No assertions** — add a meaningful `expect()` call or delete the test if it's a stub:
```javascript
// before
it('should load', async () => {
  await someController(req, res);
});

// after
it('should load', async () => {
  await someController(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
});
```

**Focused test** — remove `.only`:
```javascript
// before: it.only('...', ...)
// after:  it('...', ...)
```

**Skipped test** — either fix and re-enable, or delete:
```javascript
// before: it.skip('...', ...)
// after: fix the underlying issue, then it('...', ...)
```

**`setTimeout` in test** — replace with fake timers:
```javascript
// before
it('...', async () => {
  await new Promise(r => setTimeout(r, 500));
  expect(something).toBe(true);
});

// after
it('...', () => {
  jest.useFakeTimers();
  // trigger the code that uses setTimeout
  jest.runAllTimers();
  expect(something).toBe(true);
  jest.useRealTimers();
});
```

**`beforeAll` without `afterAll`** — add cleanup:
```javascript
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

**Empty catch** — re-throw or assert on the error:
```javascript
// before
} catch (e) {}

// after
} catch (e) {
  throw e; // or: expect(e.message).toMatch('expected error');
}
```

After fixing, re-run the auditor to confirm the score improved:
```bash
node agents/test-auditor.js
```

## Step 6: Open a PR (if fixes were made)

If files were changed, use the `test-pr` skill or follow this flow:

```bash
git checkout -b fix/test-anti-patterns
git add <changed test files>
git commit -m "test: fix anti-patterns found by test auditor

- Remove .only from X tests
- Add missing assertions to Y tests  
- Fix beforeAll/afterAll pairing in Z"

git push -u origin HEAD

gh pr create \
  --title "test: fix anti-patterns from test health audit" \
  --base main \
  --body "$(cat <<'EOF'
## What

Fixed test anti-patterns identified by `agents/test-auditor.js`.

## Issues fixed

- Removed `.only` from N tests (was silently skipping all other tests in CI)
- Added assertions to N test blocks that had none
- Added `afterAll` cleanup to N files missing it

## Health score change

Before: X/100 (Grade Y)
After: X/100 (Grade Y)

## How to verify

\`\`\`bash
node agents/test-auditor.js
\`\`\`

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

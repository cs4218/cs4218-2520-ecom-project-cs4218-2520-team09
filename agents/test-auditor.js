#!/usr/bin/env node
/**
 * Anti-Pattern & Brittle Test Auditor
 *
 * Statically analyzes Jest and Playwright test files for common anti-patterns
 * that make tests flaky, slow, or unmaintainable. Outputs a Test Health Report
 * with per-file scores and actionable suggestions.
 *
 * Usage:
 *   node agents/test-auditor.js
 *   node agents/test-auditor.js --output=test-health-report.md
 *   node agents/test-auditor.js <directory>
 *
 * Exit codes:
 *   0 — no critical issues found
 *   1 — one or more critical issues found (suitable for CI gating)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ─── Severity levels ──────────────────────────────────────────────────────────

const SEVERITY = {
  CRITICAL: 'critical', // Breaks correctness or silently skips tests
  WARNING: 'warning',   // Reduces maintainability or causes flakiness
  INFO: 'info',         // Minor hygiene issues
};

// ─── Anti-pattern definitions ─────────────────────────────────────────────────

const ANTI_PATTERNS = [
  // ── Playwright-specific ──────────────────────────────────────────────────
  {
    id: 'hard-coded-timeout',
    name: 'Hard-coded Timeout (waitForTimeout)',
    severity: SEVERITY.CRITICAL,
    fileTypes: ['spec'],
    detect: (lines) =>
      scanLines(lines, /\.(waitForTimeout|sleep)\s*\(\s*\d+/),
    suggestion:
      'Replace waitForTimeout() with explicit waits: await expect(locator).toBeVisible().',
  },
  {
    id: 'hardcoded-absolute-url',
    name: 'Hard-coded Absolute URL in goto()',
    severity: SEVERITY.WARNING,
    fileTypes: ['spec'],
    detect: (lines) =>
      scanLines(lines, /page\.goto\s*\(\s*['"`]https?:\/\//),
    suggestion:
      'Use relative paths (e.g. page.goto("/login")) with baseURL set in playwright.config.js.',
  },

  // ── Jest-specific ─────────────────────────────────────────────────────────
  {
    id: 'set-timeout-in-test',
    name: 'setTimeout() Inside Test',
    severity: SEVERITY.CRITICAL,
    fileTypes: ['test'],
    detect: (lines) =>
      scanLines(lines, /\bsetTimeout\s*\(/, { ignoreComments: true }),
    suggestion:
      'Use jest.useFakeTimers() + jest.runAllTimers(), or restructure to avoid real-time waits.',
  },
  {
    id: 'tautological-assertion',
    name: 'Tautological Assertion (expect(true).toBe(true))',
    severity: SEVERITY.WARNING,
    fileTypes: ['test'],
    detect: (lines) =>
      scanLines(
        lines,
        /expect\s*\(\s*(true|false|1|0|null|undefined)\s*\)\s*\.(toBe|toEqual|toStrictEqual)\s*\(\s*(true|false|1|0|null|undefined)\s*\)/
      ),
    suggestion:
      'Assert on actual values returned by your code, not hard-coded literals.',
  },

  // ── Both frameworks ───────────────────────────────────────────────────────
  {
    id: 'focused-test',
    name: 'Focused Test (.only)',
    severity: SEVERITY.CRITICAL,
    fileTypes: ['test', 'spec'],
    detect: (lines) =>
      scanLines(lines, /\b(test|it|describe)\.only\s*\(/),
    suggestion:
      'Remove .only before committing — it silently skips all other tests in CI.',
  },
  {
    id: 'skipped-test',
    name: 'Skipped Test (.skip / xit / xdescribe)',
    severity: SEVERITY.WARNING,
    fileTypes: ['test', 'spec'],
    detect: (lines) =>
      scanLines(lines, /\b(test|it|describe)\.skip\s*\(|\bxit\s*\(|\bxdescribe\s*\(/),
    suggestion:
      'Fix and re-enable the test, or delete it. Skipped tests rot silently and mislead coverage metrics.',
  },
  {
    id: 'console-statement',
    name: 'console.log / console.error Left In',
    severity: SEVERITY.WARNING,
    fileTypes: ['test', 'spec'],
    detect: (lines) =>
      scanLines(lines, /\bconsole\.(log|warn|error|info|debug)\s*\(/, {
        ignoreComments: true,
      }),
    suggestion: 'Remove debug console statements — they add noise to CI output.',
  },
  {
    id: 'magic-timeout-value',
    name: 'Magic Timeout Constant (≥ 1000 ms inline)',
    severity: SEVERITY.INFO,
    fileTypes: ['test', 'spec'],
    detect: (lines) =>
      scanLines(lines, /\btimeout\s*:\s*[1-9]\d{3,}/),
    suggestion:
      'Extract timeout values into named constants (e.g. const API_TIMEOUT = 5000) for clarity.',
  },
  {
    id: 'todo-fixme',
    name: 'TODO / FIXME Comment',
    severity: SEVERITY.INFO,
    fileTypes: ['test', 'spec'],
    detect: (lines) =>
      scanLines(lines, /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i),
    suggestion: 'Resolve the TODO or track it as a GitHub issue so it is not forgotten.',
  },
  {
    id: 'no-assertions',
    name: 'Test Block Without Assertions',
    severity: SEVERITY.CRITICAL,
    fileTypes: ['test', 'spec'],
    detect: (lines, content) => detectTestsWithoutAssertions(lines, content),
    suggestion:
      'Every test must verify behaviour with at least one expect() call. A test that never fails proves nothing.',
  },
  {
    id: 'missing-afterall',
    name: 'beforeAll Without Matching afterAll',
    severity: SEVERITY.WARNING,
    fileTypes: ['test', 'spec'],
    detect: (lines, content) => {
      const hasBeforeAll = /\bbeforeAll\s*\(/.test(content);
      const hasAfterAll = /\bafterAll\s*\(/.test(content);
      if (hasBeforeAll && !hasAfterAll) {
        const lineNo = lines.findIndex((l) => /\bbeforeAll\s*\(/.test(l)) + 1;
        return [{ line: lineNo, match: 'beforeAll() found but no afterAll()' }];
      }
      return [];
    },
    suggestion:
      'Add afterAll() to disconnect databases, stop servers, and clean up shared state to prevent cross-test pollution.',
  },
  {
    id: 'overly-broad-catch',
    name: 'try/catch Swallowing Errors in Test',
    severity: SEVERITY.WARNING,
    fileTypes: ['test', 'spec'],
    detect: (lines) =>
      scanLines(lines, /catch\s*\(\s*\w+\s*\)\s*\{\s*\}|catch\s*\(\s*\w+\s*\)\s*\{\s*\/\//),
    suggestion:
      'Empty catch blocks hide failures. Re-throw or assert on the caught error.',
  },
];

// ─── Detection helpers ────────────────────────────────────────────────────────

/**
 * Scan each line of a file for a regex pattern, returning an array of hits
 * with their 1-indexed line numbers and the trimmed matching line.
 */
function scanLines(lines, regex, { ignoreComments = false } = {}) {
  const hits = [];
  lines.forEach((line, i) => {
    const scanTarget = ignoreComments ? line.replace(/\/\/.*$/, '') : line;
    if (regex.test(scanTarget)) {
      hits.push({ line: i + 1, match: line.trim() });
    }
  });
  return hits;
}

/**
 * Detect test/it blocks that contain no expect() assertions.
 * Uses a simple brace-depth tracker to isolate each test body.
 */
function detectTestsWithoutAssertions(lines, _content) {
  const hits = [];
  const testStartRegex = /^\s*(test|it)\s*\(\s*['"`]/;

  lines.forEach((line, startIdx) => {
    if (!testStartRegex.test(line)) return;

    // Walk forward, tracking brace depth, to collect the test body
    let depth = 0;
    let bodyStarted = false;
    const bodyLines = [];

    for (let j = startIdx; j < lines.length; j++) {
      const l = lines[j];
      for (const ch of l) {
        if (ch === '{') { depth++; bodyStarted = true; }
        if (ch === '}') depth--;
      }
      bodyLines.push(l);
      if (bodyStarted && depth === 0) break;
    }

    const body = bodyLines.join('\n');
    const hasAssertion =
      /\bexpect\s*\(/.test(body) ||
      /await expect\s*\(/.test(body) ||
      /\.toPass\(\)/.test(body);  // Playwright's toPass()

    if (!hasAssertion) {
      hits.push({ line: startIdx + 1, match: line.trim() });
    }
  });

  return hits;
}

// ─── File discovery ───────────────────────────────────────────────────────────

function findTestFiles(rootDir) {
  const files = [];
  const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'dist', 'build', '.next']);

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (/\.(test|spec)\.(js|jsx|ts|tsx)$/.test(entry)) {
          files.push(fullPath);
        }
      } catch {
        // Ignore inaccessible paths
      }
    }
  }

  walk(rootDir);
  return files;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function getFileType(filePath) {
  return filePath.includes('.spec.') ? 'spec' : 'test';
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileType = getFileType(filePath);
  const issues = [];

  for (const pattern of ANTI_PATTERNS) {
    if (!pattern.fileTypes.includes(fileType)) continue;
    const hits = pattern.detect(lines, content);
    for (const hit of hits) {
      issues.push({
        patternId: pattern.id,
        patternName: pattern.name,
        severity: pattern.severity,
        line: hit.line,
        match: hit.match,
        suggestion: pattern.suggestion,
      });
    }
  }

  // Sort issues by line number for readability
  issues.sort((a, b) => a.line - b.line);

  return { filePath, fileType, lineCount: lines.length, issues };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const PENALTY = { [SEVERITY.CRITICAL]: 15, [SEVERITY.WARNING]: 7, [SEVERITY.INFO]: 2 };

function calculateScore(issues) {
  const total = issues.reduce((sum, i) => sum + PENALTY[i.severity], 0);
  return Math.max(0, 100 - total);
}

function scoreGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ─── Report generation ────────────────────────────────────────────────────────

const ICON = { critical: '🔴', warning: '🟡', info: '🔵' };
const FILE_ICON = (score) => (score >= 75 ? '✅' : score >= 50 ? '⚠️' : '❌');

function generateReport(results, projectRoot) {
  const scored = results.map((r) => ({ ...r, score: calculateScore(r.issues) }));
  const allIssues = scored.flatMap((r) => r.issues);

  const countBy = (sev) => allIssues.filter((i) => i.severity === sev).length;
  const criticals = countBy(SEVERITY.CRITICAL);
  const warnings = countBy(SEVERITY.WARNING);
  const infos = countBy(SEVERITY.INFO);

  const overallScore = scored.length
    ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length)
    : 100;
  const grade = scoreGrade(overallScore);

  // Pattern frequency table
  const freq = {};
  for (const issue of allIssues) {
    if (!freq[issue.patternId]) freq[issue.patternId] = { name: issue.patternName, severity: issue.severity, count: 0 };
    freq[issue.patternId].count++;
  }
  const topPatterns = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 6);

  const out = [];

  out.push(`# Test Health Report`);
  out.push(`\n> Generated: ${new Date().toUTCString()}`);
  out.push(`\n---\n`);

  // ── Summary dashboard ────────────────────────────────────────────────────
  out.push(`## Overall Health Score: ${overallScore}/100  (Grade: ${grade})\n`);
  out.push(`| Metric | Value |`);
  out.push(`|--------|-------|`);
  out.push(`| Files Analyzed | ${scored.length} |`);
  out.push(`| Total Issues | ${allIssues.length} |`);
  out.push(`| 🔴 Critical | ${criticals} |`);
  out.push(`| 🟡 Warning | ${warnings} |`);
  out.push(`| 🔵 Info | ${infos} |`);
  out.push(`| Jest Test Files | ${scored.filter((r) => r.fileType === 'test').length} |`);
  out.push(`| Playwright Spec Files | ${scored.filter((r) => r.fileType === 'spec').length} |`);

  // ── Top anti-patterns ────────────────────────────────────────────────────
  if (topPatterns.length > 0) {
    out.push(`\n---\n\n## Most Frequent Anti-Patterns\n`);
    out.push(`| # | Severity | Pattern | Occurrences |`);
    out.push(`|---|----------|---------|-------------|`);
    topPatterns.forEach((p, i) => {
      out.push(`| ${i + 1} | ${ICON[p.severity]} ${p.severity} | ${p.name} | ${p.count} |`);
    });
  }

  // ── File-by-file breakdown ───────────────────────────────────────────────
  out.push(`\n---\n\n## File-by-File Breakdown\n`);

  const sortedFiles = [...scored].sort((a, b) => a.score - b.score);

  for (const result of sortedFiles) {
    const rel = relative(projectRoot, result.filePath).replace(/\\/g, '/');
    const fileScore = result.score;
    const fileGrade = scoreGrade(fileScore);
    const icon = FILE_ICON(fileScore);

    out.push(`### ${icon} \`${rel}\`  — Score: ${fileScore}/100 (${fileGrade})\n`);

    if (result.issues.length === 0) {
      out.push(`No issues detected. Clean file.\n`);
      continue;
    }

    out.push(`| Sev | Line | Anti-Pattern | Offending Code | Fix |`);
    out.push(`|-----|------|--------------|----------------|-----|`);
    for (const issue of result.issues) {
      const snippet =
        issue.match.length > 55 ? issue.match.slice(0, 52) + '…' : issue.match;
      out.push(
        `| ${ICON[issue.severity]} | ${issue.line} | **${issue.patternName}** | \`${snippet}\` | ${issue.suggestion} |`
      );
    }
    out.push('');
  }

  // ── Recommendations ──────────────────────────────────────────────────────
  out.push(`---\n\n## Recommendations\n`);

  const recs = [];
  if (criticals > 0) {
    recs.push(
      `**Resolve all ${criticals} critical issues immediately.** ` +
        `Tests without assertions, focused tests (\`.only\`), and hard-coded secrets directly undermine ` +
        `test reliability and security.`
    );
  }
  if (warnings > 0) {
    recs.push(
      `**Address the ${warnings} warnings** to prevent brittle tests and reduce future maintenance cost.`
    );
  }
  recs.push(
    `**Add a pre-commit hook** that blocks \`.only\` and \`.skip\` from being committed ` +
      `(e.g. using \`lint-staged\` + \`grep\`).`
  );
  recs.push(
    `**Run this auditor in CI** with \`npm run audit:tests\` so the health score is tracked over time. ` +
      `The script exits with code 1 on any critical issue, making it suitable as a CI gate.`
  );
  recs.push(
    `**Adopt Playwright's built-in auto-waiting** — replace all \`waitForTimeout\` calls with ` +
      `\`await expect(locator).toBeVisible()\` or \`await page.waitForURL()\`.`
  );

  recs.forEach((r, i) => out.push(`${i + 1}. ${r}`));

  out.push(`\n---`);
  out.push(`*Anti-Pattern & Brittle Test Auditor — run \`npm run audit:tests\` to regenerate*`);

  return out.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const outputArg = args.find((a) => a.startsWith('--output='));
  const outputFile = outputArg?.split('=')[1];
  const targetDir = args.find((a) => !a.startsWith('--')) ?? PROJECT_ROOT;

  const isCi = process.env.CI === 'true';

  console.error(`\nAnti-Pattern & Brittle Test Auditor`);
  console.error(`   Scanning: ${targetDir}\n`);

  const files = findTestFiles(targetDir);

  if (files.length === 0) {
    console.error('No test files found. Exiting.');
    process.exit(0);
  }

  console.error(`   Found ${files.length} test file(s)...\n`);

  const results = files.map((filePath) => {
    const result = analyzeFile(filePath);
    const score = calculateScore(result.issues);
    const rel = relative(targetDir, filePath).replace(/\\/g, '/');
    const grade = scoreGrade(score);
    const icon = FILE_ICON(score);
    console.error(`   ${icon} ${rel.padEnd(60)} ${String(score).padStart(3)}/100  (${grade})`);
    return result;
  });

  const report = generateReport(results, targetDir);

  if (outputFile) {
    writeFileSync(outputFile, report, 'utf-8');
    console.error(`\n✅ Report written to: ${outputFile}`);
  } else {
    // Print to stdout so the report can be piped / redirected
    console.log(report);
  }

  const allIssues = results.flatMap((r) => r.issues);
  const criticalCount = allIssues.filter((i) => i.severity === SEVERITY.CRITICAL).length;

  if (criticalCount > 0) {
    console.error(`\n❌ ${criticalCount} critical issue(s) found — exiting with code 1\n`);
    process.exit(1);
  } else {
    console.error(`\n✅ No critical issues found.\n`);
    process.exit(0);
  }
}

main();

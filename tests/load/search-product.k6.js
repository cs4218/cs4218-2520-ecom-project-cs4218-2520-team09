/**
 * k6 Load Test — GET /api/v1/product/search/:keyword
 *
 * Simulates concurrent search queries from users browsing an e-commerce store.
 * Measures response times, throughput, and error rate under expected search load.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:6060";

/** Total number of failed requests (non-2xx) */
const errorCount = new Counter("search_api_errors");

/** Proportion of requests that failed — used for the error-rate threshold */
const errorRate = new Rate("search_api_error_rate");

/** Per-request response latency for this endpoint */
const responseLatency = new Trend("search_api_latency", true);

/** Number of products returned per search — tracks result consistency */
const resultsPerSearch = new Trend("search_results_per_response");

// ---------------------------------------------------------------------------
// Keyword pool
//
// A realistic mix covering:
//   • common product-name fragments (broad matches → more DB work)
//   • category/description terms
//   • short single-char queries (stress the regex index)
//   • a no-match term (verifies empty-result handling)
// ---------------------------------------------------------------------------
const KEYWORDS = [
  "phone",
  "laptop",
  "shirt",
  "shoes",
  "book",
  "camera",
  "watch",
  "bag",
  "headphone",
  "novel",
  "a",
  "pro",
  "new",
  "sport",
  "qzxnotfound",
];

// ---------------------------------------------------------------------------
// Load profile
//
// Mirrors a typical e-commerce busy-hour search pattern:
//   • Warm-up   : traffic gradually builds as users start searching  (1 min, 0→10 VUs)
//   • Ramp-up   : traffic rises to expected peak load                (2 min, 10→50 VUs)
//   • Sustained : system held at peak to measure steady-state        (3 min, 50 VUs)
//   • Ramp-down : traffic tapers off at end of peak hour             (1 min, 50→0 VUs)
//
// 50 concurrent users is a realistic daytime peak for a mid-size store.
// Search is typically heavier than browse because each keystroke may trigger
// a request, so the think-time is intentionally shorter than the listing test.
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    { duration: "1m", target: 10 }, // warm-up
    { duration: "2m", target: 50 }, // ramp-up to expected peak
    { duration: "3m", target: 50 }, // sustained peak load
    { duration: "1m", target: 0  }, // ramp-down
  ],

  thresholds: {
    // 95 % of requests must complete within 500 ms
    http_req_duration: ["p(95)<500"],

    // 99 % of requests must complete within 1 s
    search_api_latency: ["p(99)<1000"],

    // Error rate must stay below 1 %
    search_api_error_rate: ["rate<0.01"],

    // At least 99 % of all response checks must pass
    checks: ["rate>0.99"],
  },
};

export default function () {
  // Pick a random keyword from the pool for each virtual-user iteration
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  const url = `${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`;

  const res = http.get(url, {
    headers: { Accept: "application/json" },
    tags: { name: "search_product" },
  });

  // ---- record custom metrics ----
  responseLatency.add(res.timings.duration);
  const failed = res.status >= 400;
  errorRate.add(failed);
  if (failed) errorCount.add(1);

  // ---- HTTP-level checks ----
  check(res, {
    "status is 200":         (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
    "content-type is JSON":  (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),
  });

  // ---- Response body checks ----
  if (res.status === 200) {
    let results;
    try {
      results = res.json();
    } catch (_) {
      check(null, { "body is valid JSON": () => false });
      sleep(1 + Math.random() * 1);
      return;
    }

    check(results, {
      "response is an array":      (r) => Array.isArray(r),
      "result count is non-negative": (r) => Array.isArray(r) && r.length >= 0,
    });

    if (Array.isArray(results)) {
      resultsPerSearch.add(results.length);

      if (results.length > 0) {
        const p = results[0];
        check(p, {
          "product has _id":           () => p._id !== undefined,
          "product has name":          () => typeof p.name === "string",
          "product has price":         () => typeof p.price === "number",
          "product photo is excluded": () => p.photo === undefined,
        });
      }
    }
  }

  // Think-time simulates typeahead / quick searches, 1–2 s
  sleep(1 + Math.random() * 1);
}

export function setup() {
  // Preflight with a known-broad keyword to confirm the endpoint is live
  const keyword = "a";
  const url = `${BASE_URL}/api/v1/product/search/${keyword}`;
  const res = http.get(url);
  if (res.status !== 200) {
    throw new Error(
      `Preflight failed — expected HTTP 200, got ${res.status}.`
    );
  }

  let resultCount = 0;
  try { resultCount = res.json().length || 0; } catch (_) {}

  console.log(`Target   : ${BASE_URL}/api/v1/product/search/:keyword`);
  console.log(`Keywords : ${KEYWORDS.length} terms in rotation`);
  console.log(`Preflight OK — preflight query "${keyword}" returned ${resultCount} result(s)`);
  return { resultCount };
}

export function teardown(data) {
  console.log(
    `Load test complete. Preflight query returned ${data.resultCount} result(s).`
  );
}

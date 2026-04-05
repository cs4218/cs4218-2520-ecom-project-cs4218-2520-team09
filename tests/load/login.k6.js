/**
 * k6 Load Test — POST /api/v1/auth/login
 *
 * Simulates the expected number of users logging in during peak hours.
 * Measures response times and throughput under normal traffic conditions.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:6060";
const ENDPOINT = `${BASE_URL}/api/v1/auth/login`;

/** Total number of failed requests (non-2xx, or success:false on auth failure) */
const errorCount = new Counter("login_api_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("login_api_error_rate");

/** Per-request response latency for this endpoint */
const responseLatency = new Trend("login_api_latency", true);

/** Whether the server returned a valid JWT token */
const tokenIssued = new Rate("login_token_issued_rate");

// ---------------------------------------------------------------------------
// Credential pool
//
// Represents distinct user accounts active during peak hours.
// A realistic store has many more registered users than concurrent sessions;
// cycling through multiple accounts avoids artificially warming a single
// DB row in the query cache and reflects real access patterns.
// ---------------------------------------------------------------------------
const USERS = [
  { email: "cs4218@test.com", password: "cs4218@test.com" },
  { email: "user@test.com", password: "user@test.com" },
  { email: "test@gmail.com", password: "test@gmail.com" },
];

// ---------------------------------------------------------------------------
// Load profile
//
// Models the login spike at the start of a peak shopping hour:
//   • Warm-up   : a trickle of early users sign in               (1 min, 0→10 VUs)
//   • Ramp-up   : login rate rises as the peak hour begins       (2 min, 10→40 VUs)
//   • Sustained : steady peak — most users are already logged in (3 min, 40 VUs)
//   • Ramp-down : login rate falls as the session pool fills up  (1 min, 40→0 VUs)
//
// Peak target is 40 VUs (lower than the 50 used for browse/search) because
// login is a one-time action per session rather than a repeated page load.
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    { duration: "1m", target: 10 }, // warm-up
    { duration: "2m", target: 40 }, // ramp-up to peak
    { duration: "3m", target: 40 }, // sustained peak load
    { duration: "1m", target: 0  }, // ramp-down
  ],

  thresholds: {
    // 95 % of requests must complete within 500 ms
    http_req_duration: ["p(95)<500"],

    // 99 % of requests must complete within 1 s
    login_api_latency: ["p(99)<1000"],

    // Server error rate (5xx) must stay below 1 %
    login_api_error_rate: ["rate<0.01"],

    // At least 99 % of all response checks must pass
    checks: ["rate>0.99"],
  },
};

export default function () {
  // Each VU picks a credential from the pool deterministically so that
  // the full pool is exercised evenly across all virtual users.
  const creds = USERS[__VU % USERS.length];

  const payload = JSON.stringify({
    email:    creds.email,
    password: creds.password,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      Accept:         "application/json",
    },
    tags: { name: "login" },
  };

  const res = http.post(ENDPOINT, payload, params);

  // ---- record custom metrics ----
  responseLatency.add(res.timings.duration);

  // Only 5xx counts as an infrastructure error; 404/401 are app-level outcomes
  const serverError = res.status >= 500;
  errorRate.add(serverError);
  if (serverError) errorCount.add(1);

  // ---- HTTP-level checks ----
  check(res, {
    "status is 200":         (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
    "content-type is JSON":  (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),
  });

  // ---- Response body checks ----
  if (res.status === 200) {
    let body;
    try {
      body = res.json();
    } catch (_) {
      check(null, { "body is valid JSON": () => false });
      sleep(2 + Math.random() * 3);
      return;
    }

    const succeeded = body.success === true;
    tokenIssued.add(succeeded);

    check(body, {
      "success flag is true":    (b) => b.success === true,
      "message is present":      (b) => typeof b.message === "string",
      "token is returned":       (b) => typeof b.token === "string" && b.token.length > 0,
      "user object is returned": (b) => b.user !== null && typeof b.user === "object",
    });

    if (succeeded && body.user) {
      check(body.user, {
        "user has _id":   (u) => u._id !== undefined,
        "user has name":  (u) => typeof u.name === "string",
        "user has email": (u) => typeof u.email === "string",
        "user has role":  (u) => u.role !== undefined,
      });
    }
  }

  // Think-time: a user who just logged in navigates to the next page (2–5 s)
  sleep(2 + Math.random() * 3);
}

export function setup() {
  // Preflight: verify the endpoint is reachable with the first test credential
  const creds = USERS[0];
  const res = http.post(
    ENDPOINT,
    JSON.stringify({ email: creds.email, password: creds.password }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (res.status >= 500) {
    throw new Error(
      `Preflight failed — server error ${res.status}.`
    );
  }

  let preflightStatus;
  try {
    preflightStatus = res.json().success ? "authenticated" : "credential mismatch";
  } catch (_) {
    preflightStatus = "non-JSON response";
  }

  console.log(`Target   : ${ENDPOINT}`);
  console.log(`Users    : ${USERS.length} credential(s) in rotation`);
  console.log(`Preflight: HTTP ${res.status} — ${preflightStatus}`);
  return {};
}

export function teardown() {
  console.log("Login load test complete.");
}

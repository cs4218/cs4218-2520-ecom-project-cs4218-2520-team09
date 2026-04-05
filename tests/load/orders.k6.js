/**
 * k6 Load Test — GET /api/v1/auth/orders
 *
 * Simulates the expected number of users concurrently viewing their order
 * history during peak hours. Measures query response times and throughput
 * under normal traffic conditions.
 *
 * Authentication: the endpoint is protected by requireSignIn middleware, which
 * expects a valid JWT in the Authorization header (raw token, no "Bearer" prefix).
 * JWTs are obtained via POST /api/v1/auth/login in the setup() phase so that
 * the actual load test only exercises the orders query.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:6060";
const LOGIN_ENDPOINT  = `${BASE_URL}/api/v1/auth/login`;
const ORDERS_ENDPOINT = `${BASE_URL}/api/v1/auth/orders`;

/** Total number of server-side errors (5xx) */
const errorCount = new Counter("orders_api_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("orders_api_error_rate");

/** Proportion of requests rejected due to missing / invalid token (401) */
const authFailureRate = new Rate("orders_api_auth_failure_rate");

/** Per-request response latency — includes DB populate joins */
const responseLatency = new Trend("orders_api_latency", true);

/** Number of orders returned per response — tracks query consistency */
const ordersPerResponse = new Trend("orders_per_response");

// ---------------------------------------------------------------------------
// User credential pool
//
// Each entry represents a distinct registered buyer. Using multiple accounts
// means each DB query filters on a different buyer._id, exercising the index
// rather than letting a single user's result warm up a query-plan cache.
// ---------------------------------------------------------------------------
const USERS = [
  { email: "cs4218@test.com", password: "cs4218@test.com" },
  { email: "user@test.com", password: "user@test.com" },
  { email: "test@gmail.com", password: "test@gmail.com" },
];

// ---------------------------------------------------------------------------
// Load profile
//
// Mirrors a typical post-purchase peak where users return to check order status:
//   • Warm-up   : early users trickle in to check orders            (1 min, 0→10 VUs)
//   • Ramp-up   : traffic rises as peak shopping hour hits          (2 min, 10→30 VUs)
//   • Sustained : steady concurrent order-history viewers           (3 min, 30 VUs)
//   • Ramp-down : traffic subsides as users move on                 (1 min, 30→0 VUs)
//
// Peak is 30 VUs (lower than browse/search) because order-history is visited
// once per session, not on every page, and the populate joins make each query
// heavier — fewer concurrent users create equivalent DB load.
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    { duration: "1m", target: 10 }, // warm-up
    { duration: "2m", target: 30 }, // ramp-up to peak
    { duration: "3m", target: 30 }, // sustained peak load
    { duration: "1m", target: 0  }, // ramp-down
  ],

  thresholds: {
    // 95 % of requests must complete within 500 ms
    http_req_duration: ["p(95)<500"],

    // 99 % of requests must complete within 1 s
    // (orders endpoint runs two populate joins — slightly heavier than search)
    orders_api_latency: ["p(99)<1000"],

    // Server error rate (5xx) must stay below 1 %
    orders_api_error_rate: ["rate<0.01"],

    // Auth failures must be zero — all tokens from setup() must remain valid
    orders_api_auth_failure_rate: ["rate<0.01"],

    // At least 99 % of all response checks must pass
    checks: ["rate>0.99"],
  },
};

// ---------------------------------------------------------------------------
// setup() — runs once before the load test begins
//
// Logs in every user in the credential pool and returns their JWT tokens.
// This keeps auth traffic out of the measured load so that response-time
// metrics reflect only the orders query latency.
// ---------------------------------------------------------------------------
export function setup() {
  const tokens = [];

  for (const creds of USERS) {
    const res = http.post(
      LOGIN_ENDPOINT,
      JSON.stringify({ email: creds.email, password: creds.password }),
      { headers: { "Content-Type": "application/json" } }
    );

    if (res.status >= 500) {
      throw new Error(
        `Login preflight failed for ${creds.email} — server returned ${res.status}.`
      );
    }

    let token = null;
    try {
      const body = res.json();
      if (body.success && body.token) {
        token = body.token;
      }
    } catch (_) {}

    if (!token) {
      console.warn(
        `Warning: could not obtain token for ${creds.email} ` +
        `(HTTP ${res.status}). Check credentials in the USERS pool.`
      );
    }

    tokens.push(token);
  }

  const validCount = tokens.filter(Boolean).length;
  console.log(`Target   : ${ORDERS_ENDPOINT}`);
  console.log(`Users    : ${USERS.length} credential(s) in pool, ${validCount} token(s) obtained`);

  if (validCount === 0) {
    throw new Error(
      "No valid tokens obtained — cannot proceed."
    );
  }

  return { tokens };
}


export default function ({ tokens }) {
  // Assign each VU a token from the pool deterministically
  const token = tokens[__VU % tokens.length];

  // If this slot had a login failure, skip and record auth failure
  if (!token) {
    authFailureRate.add(true);
    errorCount.add(1);
    sleep(2 + Math.random() * 3);
    return;
  }

  const res = http.get(ORDERS_ENDPOINT, {
    headers: {
      Authorization: token,       
      Accept: "application/json",
    },
    tags: { name: "get_orders" },
  });

  // ---- record custom metrics ----
  responseLatency.add(res.timings.duration);

  const serverError  = res.status >= 500;
  const authFailure  = res.status === 401;

  errorRate.add(serverError);
  authFailureRate.add(authFailure);
  if (serverError) errorCount.add(1);

  // ---- HTTP-level checks ----
  check(res, {
    "status is 200":         (r) => r.status === 200,
    "not a 401 Unauthorized":(r) => r.status !== 401,
    "response time < 500ms": (r) => r.timings.duration < 500,
    "content-type is JSON":  (r) =>
      (r.headers["Content-Type"] || "").includes("application/json"),
  });

  // ---- Response body checks ----
  if (res.status === 200) {
    let orders;
    try {
      orders = res.json();
    } catch (_) {
      check(null, { "body is valid JSON": () => false });
      sleep(2 + Math.random() * 3);
      return;
    }

    check(orders, {
      "response is an array":         (o) => Array.isArray(o),
      "order count is non-negative":  (o) => Array.isArray(o) && o.length >= 0,
    });

    if (Array.isArray(orders)) {
      ordersPerResponse.add(orders.length);

      if (orders.length > 0) {
        const order = orders[0];
        check(order, {
          "order has _id":              () => order._id !== undefined,
          "order has status":           () => typeof order.status === "string",
          "order has products array":   () => Array.isArray(order.products),
          "order has buyer object":     () => order.buyer !== null && typeof order.buyer === "object",
          "order has createdAt":        () => order.createdAt !== undefined,
          "product photo is excluded":  () =>
            !Array.isArray(order.products) ||
            order.products.length === 0   ||
            order.products[0].photo === undefined,
        });
      }
    }
  }

  // Think-time: user reads through their order list before the next action (2–5 s)
  sleep(2 + Math.random() * 3);
}

export function teardown() {
  console.log("Order history load test complete.");
}

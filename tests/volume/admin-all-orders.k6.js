/**
 * Tan Wei Zhi, A0253519B
 *
 * k6 Volume Test — GET /api/v1/auth/all-orders
 *
 * Measures how the admin all-orders endpoint sustains throughput when
 * serving a large volume of sequential read requests against a growing
 * order collection.  Each request fetches the full order list with two
 * populate joins (products + buyer), so the test exercises the DB read
 * path at volume.
 *
 * Volume focus: total read throughput and response consistency as request
 * count accumulates, not concurrent-admin simulation.
 *
 * Authentication: the endpoint requires requireSignIn + isAdmin.  The
 * admin JWT is obtained in setup() and reused across all iterations.
 *
 * Note: ADMIN_USERS must contain accounts with role === 1 in the database.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL            = "http://localhost:6060";
const LOGIN_ENDPOINT      = `${BASE_URL}/api/v1/auth/login`;
const ALL_ORDERS_ENDPOINT = `${BASE_URL}/api/v1/auth/all-orders`;

/** Total requests attempted */
const totalRequests = new Counter("admin_orders_total_requests");

/** Total server-side errors (5xx) */
const errorCount = new Counter("admin_orders_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("admin_orders_error_rate");

/** Proportion of requests rejected due to missing / invalid admin token */
const authFailureRate = new Rate("admin_orders_auth_failure_rate");

/** Per-request response latency — includes two populate joins */
const responseLatency = new Trend("admin_orders_latency", true);

/** Number of orders returned per response */
const ordersPerResponse = new Trend("admin_orders_per_response");

// ---------------------------------------------------------------------------
// Admin credential pool — all accounts must have role === 1 in the DB
// ---------------------------------------------------------------------------
const ADMIN_USERS = [
    { email: "cs4218@test.com", password: "cs4218@test.com" },
];

// ---------------------------------------------------------------------------
// Volume profile
//
// 10 VUs share 500 total iterations.  The endpoint fetches the entire order
// collection on each request; the high iteration count exercises the DB read
// path at volume and confirms the populate joins remain stable over time.
// ---------------------------------------------------------------------------
export const options = {
    scenarios: {
        volume: {
            executor: "shared-iterations",
            vus: 10,
            iterations: 500,
            maxDuration: "10m",
        },
    },

    thresholds: {
        // Server error rate (5xx) must stay below 1 %
        admin_orders_error_rate: ["rate<0.01"],

        // Auth failures must be negligible
        admin_orders_auth_failure_rate: ["rate<0.01"],

        // 95 % of requests must complete within 500 ms
        // (two populate joins — heavier than a simple read)
        admin_orders_latency: ["p(95)<500"],

        // At least 99 % of all response checks must pass
        checks: ["rate>0.99"],
    },
};

// ---------------------------------------------------------------------------
// setup() — logs in all admin accounts and returns their JWTs
// ---------------------------------------------------------------------------
export function setup() {
    const tokens = [];

    for (const creds of ADMIN_USERS) {
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
            if (body.success && body.token) token = body.token;
        } catch (_) {}

        if (!token) {
            console.warn(
                `Warning: could not obtain token for ${creds.email} (HTTP ${res.status}). ` +
                `Ensure this account has admin role in the DB.`
            );
        }

        tokens.push(token);
    }

    const validCount = tokens.filter(Boolean).length;
    if (validCount === 0) {
        throw new Error("No valid admin tokens obtained — cannot proceed.");
    }

    console.log(`Target     : ${ALL_ORDERS_ENDPOINT}`);
    console.log(`Iterations : 500 total across 10 VUs`);
    console.log(`Admins     : ${ADMIN_USERS.length} credential(s), ${validCount} token(s) obtained`);
    return { tokens };
}


export default function ({ tokens }) {
    const token = tokens[__VU % tokens.length];

    if (!token) {
        authFailureRate.add(true);
        errorCount.add(1);
        return;
    }

    const res = http.get(ALL_ORDERS_ENDPOINT, {
        headers: {
            Authorization: token,
            Accept:        "application/json",
        },
        tags: { name: "admin_all_orders" },
    });

    totalRequests.add(1);
    responseLatency.add(res.timings.duration);

    const serverError = res.status >= 500;
    const authFailure = res.status === 401 || res.status === 403;

    errorRate.add(serverError);
    authFailureRate.add(authFailure);
    if (serverError) errorCount.add(1);

    // ---- HTTP-level checks ----
    check(res, {
        "status is 200":          (r) => r.status === 200,
        "not a 401 Unauthorized": (r) => r.status !== 401,
        "not a 403 Forbidden":    (r) => r.status !== 403,
        "response time < 500ms":  (r) => r.timings.duration < 500,
        "content-type is JSON":   (r) =>
            (r.headers["Content-Type"] || "").includes("application/json"),
    });

    // ---- Response body checks ----
    if (res.status === 200) {
        let orders;
        try {
            orders = res.json();
        } catch (_) {
            check(null, { "body is valid JSON": () => false });
            return;
        }

        check(orders, {
            "response is an array":        (o) => Array.isArray(o),
            "order count is non-negative": (o) => Array.isArray(o) && o.length >= 0,
        });

        if (Array.isArray(orders)) {
            ordersPerResponse.add(orders.length);

            if (orders.length > 0) {
                const order = orders[0];
                check(order, {
                    "order has _id":            () => order._id !== undefined,
                    "order has status":         () => typeof order.status === "string",
                    "order has products array": () => Array.isArray(order.products),
                    "order has buyer object":   () => order.buyer !== null && typeof order.buyer === "object",
                    "order has createdAt":      () => order.createdAt !== undefined,
                    "product photo excluded":   () =>
                        !Array.isArray(order.products) ||
                        order.products.length === 0    ||
                        order.products[0].photo === undefined,
                });
            }
        }
    }

    sleep(0.5);
}

export function teardown() {
    console.log("Admin all-orders volume test complete.");
}

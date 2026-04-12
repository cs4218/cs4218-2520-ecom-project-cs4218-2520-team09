/**
 * Tan Wei Zhi, A0253519B
 *
 * k6 Volume Test — PUT /api/v1/auth/order-status/:orderId
 *
 * Measures how the order-status endpoint sustains throughput when processing
 * a large volume of sequential status-update writes.  All available order IDs
 * are fetched in setup() and cycled through during the test so that many
 * distinct DB documents are updated, reflecting realistic fulfilment volume.
 *
 * Volume focus: total write throughput and error rate under a high volume of
 * findByIdAndUpdate operations, not concurrent-admin simulation.
 *
 * Authentication: the endpoint requires requireSignIn + isAdmin.  Admin JWTs
 * are obtained in setup() and reused across all iterations.
 *
 * Note: ADMIN_USERS must contain accounts with role === 1 in the database.
 * At least one order must exist in the database before running.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL            = "http://localhost:6060";
const LOGIN_ENDPOINT      = `${BASE_URL}/api/v1/auth/login`;
const ALL_ORDERS_ENDPOINT = `${BASE_URL}/api/v1/auth/all-orders`;
const ORDER_STATUS_BASE   = `${BASE_URL}/api/v1/auth/order-status`;

/** Total requests attempted */
const totalRequests = new Counter("order_status_total_requests");

/** Total server-side errors (5xx) */
const errorCount = new Counter("order_status_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("order_status_error_rate");

/** Proportion of requests rejected due to missing / invalid admin token */
const authFailureRate = new Rate("order_status_auth_failure_rate");

/** Per-request response latency */
const responseLatency = new Trend("order_status_latency", true);

// ---------------------------------------------------------------------------
// Admin credential pool — all accounts must have role === 1 in the DB
// ---------------------------------------------------------------------------
const ADMIN_USERS = [
    { email: "cs4218@test.com", password: "cs4218@test.com" },
];

// ---------------------------------------------------------------------------
// Status cycle — all valid values for the order status field
// ---------------------------------------------------------------------------
const STATUS_VALUES = [
    "Not Process",
    "Processing",
    "Shipped",
    "deliverd",
    "cancel",
];

// ---------------------------------------------------------------------------
// Volume profile
//
// 10 VUs share 500 total iterations.  Each iteration writes a status update
// to one of the orders in the pool, exercising the DB write path at volume
// and confirming the endpoint remains stable under sustained writes.
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
        order_status_error_rate: ["rate<0.01"],

        // Auth failures must be negligible
        order_status_auth_failure_rate: ["rate<0.01"],

        // 95 % of requests must complete within 500 ms
        order_status_latency: ["p(95)<500"],

        // At least 99 % of all response checks must pass
        checks: ["rate>0.99"],
    },
};

// ---------------------------------------------------------------------------
// setup() — obtains admin JWTs and fetches all order IDs
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

    // Fetch all order IDs so iterations can write to distinct DB documents
    const adminToken = tokens.find(Boolean);
    const ordersRes  = http.get(ALL_ORDERS_ENDPOINT, {
        headers: { Authorization: adminToken, Accept: "application/json" },
    });

    if (ordersRes.status >= 500) {
        throw new Error(`Order list preflight failed — server returned ${ordersRes.status}.`);
    }

    let orderIds = [];
    try {
        const orders = ordersRes.json();
        if (Array.isArray(orders)) {
            orderIds = orders.map((o) => o._id).filter(Boolean);
        }
    } catch (_) {}

    if (orderIds.length === 0) {
        throw new Error(
            "No orders found in the database — seed at least one order before running this test."
        );
    }

    console.log(`Target     : ${ORDER_STATUS_BASE}/:orderId`);
    console.log(`Iterations : 500 total across 10 VUs`);
    console.log(`Admins     : ${ADMIN_USERS.length} credential(s), ${validCount} token(s) obtained`);
    console.log(`Orders     : ${orderIds.length} order ID(s) available`);
    console.log(`Statuses   : ${STATUS_VALUES.join(", ")}`);

    return { tokens, orderIds };
}


export default function ({ tokens, orderIds }) {
    const token   = tokens[__VU % tokens.length];
    const orderId = orderIds[(__VU + __ITER) % orderIds.length];
    const status  = STATUS_VALUES[(__VU + __ITER) % STATUS_VALUES.length];

    if (!token) {
        authFailureRate.add(true);
        errorCount.add(1);
        return;
    }

    const res = http.put(
        `${ORDER_STATUS_BASE}/${orderId}`,
        JSON.stringify({ status }),
        {
            headers: {
                "Content-Type": "application/json",
                Accept:         "application/json",
                Authorization:  token,
            },
            tags: { name: "update_order_status" },
        }
    );

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
        let order;
        try {
            order = res.json();
        } catch (_) {
            check(null, { "body is valid JSON": () => false });
            return;
        }

        check(order, {
            "order has _id":          (o) => o._id !== undefined,
            "order has status":       (o) => typeof o.status === "string",
            "status matches request": (o) => o.status === status,
            "order has products":     (o) => Array.isArray(o.products),
            "order has buyer":        (o) => o.buyer !== undefined,
        });
    }

    sleep(0.5);
}

export function teardown() {
    console.log("Update order status volume test complete.");
}

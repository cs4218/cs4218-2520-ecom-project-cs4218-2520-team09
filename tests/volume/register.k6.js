/**
 * Tan Wei Zhi, A0253519B
 *
 * k6 Volume Test — POST /api/v1/auth/register
 *
 * Measures how the registration endpoint behaves when processing a large
 * volume of new user sign-ups in sequence.  Each iteration creates a
 * distinct user (unique email via __VU + __ITER), so the user collection
 * grows throughout the run and the duplicate-check query operates against
 * an ever-larger dataset.
 *
 * Volume focus: total throughput and error rate as the DB user collection
 * scales up, not concurrent-user simulation.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:6060";
const ENDPOINT = `${BASE_URL}/api/v1/auth/register`;

/** Total registration requests attempted */
const totalRequests = new Counter("register_total_requests");

/** Total server-side errors (5xx) */
const errorCount = new Counter("register_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("register_error_rate");

/** Per-request response latency */
const responseLatency = new Trend("register_latency", true);

/** Proportion of registrations accepted (new user created) */
const successRate = new Rate("register_success_rate");

// ---------------------------------------------------------------------------
// Volume profile
//
// 10 VUs share 500 total iterations.  The goal is to exercise the endpoint
// under a high volume of sequential DB writes (user inserts + bcrypt hashes)
// and confirm error rate stays near zero as the collection grows.
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
        register_error_rate: ["rate<0.01"],

        // 95 % of requests must complete within 500 ms
        register_latency: ["p(95)<500"],

        // At least 99 % of all response checks must pass
        checks: ["rate>0.99"],
    },
};

// ---------------------------------------------------------------------------
// setup() — runs once before the volume test begins
// ---------------------------------------------------------------------------
export function setup() {
    // Preflight: confirm the server is reachable (empty body returns a
    // validation error, not a 5xx, so no real data is created)
    const res = http.post(
        ENDPOINT,
        JSON.stringify({}),
        { headers: { "Content-Type": "application/json" } }
    );

    if (res.status >= 500) {
        throw new Error(`Preflight failed — server returned ${res.status}.`);
    }

    console.log(`Target     : ${ENDPOINT}`);
    console.log(`Iterations : 500 total across 10 VUs`);
    console.log(`Preflight  : HTTP ${res.status} — server is reachable`);
    return {};
}


export default function () {
    // Unique email per VU + iteration so every request attempts a fresh insert
    const email    = `vol_vu${__VU}_iter${__ITER}@test.com`;
    const password = "VolumeTest123!";

    const payload = JSON.stringify({
        name:    `Vol User ${__VU}-${__ITER}`,
        email,
        password,
        phone:   "91234567",
        address: "1 Volume Test Street",
        answer:  "volumetest",
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
            Accept:         "application/json",
        },
        tags: { name: "register" },
    };

    const res = http.post(ENDPOINT, payload, params);

    totalRequests.add(1);
    responseLatency.add(res.timings.duration);

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
            return;
        }

        const registered = body.success === true;
        successRate.add(registered);

        check(body, {
            "success flag is true": (b) => b.success === true,
            "message is present":   (b) => typeof b.message === "string",
            "user object returned": (b) => b.user !== null && typeof b.user === "object",
        });

        if (registered && body.user) {
            check(body.user, {
                "user has _id":   (u) => u._id !== undefined,
                "user has name":  (u) => typeof u.name === "string",
                "user has email": (u) => typeof u.email === "string",
                "user has role":  (u) => u.role !== undefined,
            });
        }
    }

    sleep(0.5);
}

export function teardown() {
    console.log("User registration volume test complete.");
}

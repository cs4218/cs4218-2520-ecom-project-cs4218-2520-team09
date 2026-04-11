/**
 * Tan Wei Zhi, A0253519B
 *
 * k6 Volume Test — PUT /api/v1/auth/profile
 *
 * Measures how the profile-update endpoint sustains throughput when
 * processing a large volume of sequential write requests.  Multiple user
 * accounts are cycled through so that different DB rows are written,
 * reflecting realistic data spread rather than a single-row hot-spot.
 *
 * Volume focus: total write throughput and error rate under a high volume
 * of findByIdAndUpdate operations, not concurrent-user simulation.
 *
 * Authentication: JWTs are obtained in setup() and reused across all
 * iterations to keep auth traffic out of the measured volume.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL         = "http://localhost:6060";
const LOGIN_ENDPOINT   = `${BASE_URL}/api/v1/auth/login`;
const PROFILE_ENDPOINT = `${BASE_URL}/api/v1/auth/profile`;

/** Total requests attempted */
const totalRequests = new Counter("update_profile_total_requests");

/** Total server-side errors (5xx) */
const errorCount = new Counter("update_profile_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("update_profile_error_rate");

/** Proportion of requests rejected due to missing / invalid token */
const authFailureRate = new Rate("update_profile_auth_failure_rate");

/** Per-request response latency */
const responseLatency = new Trend("update_profile_latency", true);

// ---------------------------------------------------------------------------
// User credential pool
// ---------------------------------------------------------------------------
const USERS = [
    { email: "cs4218@test.com", password: "cs4218@test.com" },
    { email: "user@test.com",   password: "user@test.com"   },
    { email: "test@gmail.com",  password: "test@gmail.com"  },
];

// ---------------------------------------------------------------------------
// Profile update variants — cycled per iteration to vary the written data
// ---------------------------------------------------------------------------
const PROFILE_UPDATES = [
    { name: "Vol User Alpha",   phone: "91111111", address: "1 Alpha Street"    },
    { name: "Vol User Beta",    phone: "92222222", address: "2 Beta Avenue"     },
    { name: "Vol User Gamma",   phone: "93333333", address: "3 Gamma Road"      },
    { name: "Vol User Delta",   phone: "94444444", address: "4 Delta Boulevard" },
    { name: "Vol User Epsilon", phone: "95555555", address: "5 Epsilon Lane"    },
];

// ---------------------------------------------------------------------------
// Volume profile
//
// 10 VUs share 500 total iterations.  Each iteration writes a profile update
// to one of the user accounts in the pool, exercising the DB write path at
// volume and confirming the endpoint remains stable under sustained writes.
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
        update_profile_error_rate: ["rate<0.01"],

        // Auth failures must be negligible
        update_profile_auth_failure_rate: ["rate<0.01"],

        // 95 % of requests must complete within 500 ms
        update_profile_latency: ["p(95)<500"],

        // At least 99 % of all response checks must pass
        checks: ["rate>0.99"],
    },
};

// ---------------------------------------------------------------------------
// setup() — logs in all users and returns their JWTs
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
            if (body.success && body.token) token = body.token;
        } catch (_) {}

        if (!token) {
            console.warn(
                `Warning: could not obtain token for ${creds.email} (HTTP ${res.status}).`
            );
        }

        tokens.push(token);
    }

    const validCount = tokens.filter(Boolean).length;
    if (validCount === 0) {
        throw new Error("No valid tokens obtained — cannot proceed.");
    }

    console.log(`Target     : ${PROFILE_ENDPOINT}`);
    console.log(`Iterations : 500 total across 10 VUs`);
    console.log(`Users      : ${USERS.length} credential(s), ${validCount} token(s) obtained`);
    return { tokens };
}


export default function ({ tokens }) {
    const token  = tokens[__VU % tokens.length];
    const update = PROFILE_UPDATES[(__VU + __ITER) % PROFILE_UPDATES.length];

    if (!token) {
        authFailureRate.add(true);
        errorCount.add(1);
        return;
    }

    const res = http.put(PROFILE_ENDPOINT, JSON.stringify(update), {
        headers: {
            "Content-Type": "application/json",
            Accept:         "application/json",
            Authorization:  token,
        },
        tags: { name: "update_profile" },
    });

    totalRequests.add(1);
    responseLatency.add(res.timings.duration);

    const serverError = res.status >= 500;
    const authFailure = res.status === 401;

    errorRate.add(serverError);
    authFailureRate.add(authFailure);
    if (serverError) errorCount.add(1);

    // ---- HTTP-level checks ----
    check(res, {
        "status is 200":          (r) => r.status === 200,
        "not a 401 Unauthorized": (r) => r.status !== 401,
        "response time < 500ms":  (r) => r.timings.duration < 500,
        "content-type is JSON":   (r) =>
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

        check(body, {
            "success flag is true":    (b) => b.success === true,
            "message is present":      (b) => typeof b.message === "string",
            "updatedUser is returned": (b) => b.updatedUser !== null && typeof b.updatedUser === "object",
        });

        if (body.updatedUser) {
            check(body.updatedUser, {
                "updatedUser has _id":   (u) => u._id !== undefined,
                "updatedUser has name":  (u) => typeof u.name === "string",
                "updatedUser has email": (u) => typeof u.email === "string",
                "password is excluded":  (u) => u.password === undefined,
            });
        }
    }

    sleep(0.5);
}

export function teardown() {
    console.log("Update profile volume test complete.");
}

/**
 * Tan Wei Zhi, A0253519B
 *
 * k6 Volume Test — GET /api/v1/category/get-category
 *
 * Measures how the category endpoint sustains throughput when serving a
 * large volume of sequential read requests.  Because the category list is
 * fetched on every page navigation (shop, home, admin dashboard), it must
 * remain consistent and fast even as request volume accumulates.
 *
 * Volume focus: total throughput and response consistency across a high
 * request count, not concurrent-user simulation.
 *
 * The endpoint is public — no authentication is required.
 *
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = "http://localhost:6060";
const ENDPOINT = `${BASE_URL}/api/v1/category/get-category`;

/** Total requests attempted */
const totalRequests = new Counter("categories_total_requests");

/** Total server-side errors (5xx) */
const errorCount = new Counter("categories_errors");

/** Proportion of requests that resulted in a server error (5xx) */
const errorRate = new Rate("categories_error_rate");

/** Per-request response latency */
const responseLatency = new Trend("categories_latency", true);

/** Number of categories returned per response — tracks result consistency */
const categoriesPerResponse = new Trend("categories_per_response");

// ---------------------------------------------------------------------------
// Volume profile
//
// 10 VUs share 1000 total iterations.  The category collection is small but
// read very frequently; the high iteration count confirms the endpoint
// maintains consistent results and low latency across a large request volume.
// ---------------------------------------------------------------------------
export const options = {
    scenarios: {
        volume: {
            executor: "shared-iterations",
            vus: 10,
            iterations: 1000,
            maxDuration: "10m",
        },
    },

    thresholds: {
        // Server error rate (5xx) must stay below 1 %
        categories_error_rate: ["rate<0.01"],

        // 95 % of requests must complete within 500 ms
        categories_latency: ["p(95)<500"],

        // At least 99 % of all response checks must pass
        checks: ["rate>0.99"],
    },
};

// ---------------------------------------------------------------------------
// setup() — runs once before the volume test begins
// ---------------------------------------------------------------------------
export function setup() {
    const res = http.get(ENDPOINT, {
        headers: { Accept: "application/json" },
    });

    if (res.status >= 500) {
        throw new Error(`Preflight failed — server returned ${res.status}.`);
    }

    let categoryCount = 0;
    try {
        const body = res.json();
        if (Array.isArray(body.category)) categoryCount = body.category.length;
    } catch (_) {}

    console.log(`Target     : ${ENDPOINT}`);
    console.log(`Iterations : 1000 total across 10 VUs`);
    console.log(`Preflight  : HTTP ${res.status} — ${categoryCount} categories in catalogue`);
    return {};
}


export default function () {
    const res = http.get(ENDPOINT, {
        headers: { Accept: "application/json" },
        tags: { name: "get_categories" },
    });

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

        check(body, {
            "success flag is true":       (b) => b.success === true,
            "message is present":         (b) => typeof b.message === "string",
            "category is an array":       (b) => Array.isArray(b.category),
            "category count is positive": (b) => Array.isArray(b.category) && b.category.length > 0,
        });

        if (Array.isArray(body.category)) {
            categoriesPerResponse.add(body.category.length);

            if (body.category.length > 0) {
                const cat = body.category[0];
                check(cat, {
                    "category has _id":  () => cat._id !== undefined,
                    "category has name": () => typeof cat.name === "string",
                    "category has slug": () => typeof cat.slug === "string",
                });
            }
        }
    }

    sleep(0.5);
}

export function teardown() {
    console.log("Get categories volume test complete.");
}

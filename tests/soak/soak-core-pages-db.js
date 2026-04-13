/**
 * Core Pages + DB Config Soak Test (k6)
 * Author: Jinhan Wu, A0266075Y
 */

import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Core-page supporting public endpoints (indirectly exercises DB config/connection pool).
const PRODUCT_LIST_URL = `${BASE_URL}/api/v1/product/product-list/1`;
const PRODUCT_COUNT_URL = `${BASE_URL}/api/v1/product/product-count`;
const CATEGORY_LIST_URL = `${BASE_URL}/api/v1/category/get-category`;

const TARGET_VUS = Number(__ENV.TARGET_VUS || 25);
const PAUSE_SECONDS = Number(__ENV.PAUSE_SECONDS || 1);
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || "1m";
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || "1m";

// Drift tracking: compare current request latency to a baseline captured in setup().
const dbResponseTimeDriftMs = new Trend("db_response_time_drift_ms", true);

const coreDbErrorRate = new Rate("core_db_error_rate");

export const options = {
  scenarios: {
    core_pages_db_soak: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: RAMP_UP_DURATION, target: TARGET_VUS },
        { duration: SOAK_DURATION, target: TARGET_VUS },
        { duration: RAMP_DOWN_DURATION, target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    core_db_error_rate: ["rate<0.01"],
  },
  summaryTimeUnit: "ms",
  discardResponseBodies: false,
};

function parseJsonOrNull(res) {
  try {
    return res.json();
  } catch (_) {
    return null;
  }
}

export function setup() {
  // Jinhan Wu, A0266075Y: capture baseline latencies to quantify response-time drift during soak
  // Capture baselines once per k6 run (not per VU) so drift can be computed over soak duration.
  const productList = http.get(PRODUCT_LIST_URL);
  const productCount = http.get(PRODUCT_COUNT_URL);
  const categoryList = http.get(CATEGORY_LIST_URL);

  const productListBody = parseJsonOrNull(productList);
  const productCountBody = parseJsonOrNull(productCount);
  const categoryListBody = parseJsonOrNull(categoryList);

  const ok =
    productList.status === 200 &&
    productListBody &&
    productListBody.success === true &&
    Array.isArray(productListBody.products) &&
    productCount.status === 200 &&
    productCountBody &&
    productCountBody.success === true &&
    typeof productCountBody.total === "number" &&
    categoryList.status === 200 &&
    categoryListBody &&
    categoryListBody.success === true &&
    Array.isArray(categoryListBody.category);

  return {
    baselineMs: {
      productList: productList.timings.duration,
      productCount: productCount.timings.duration,
      categoryList: categoryList.timings.duration,
    },
    baselineOk: ok,
  };
}

function driftAndValidate(url, baselineMs, validateFn) {
  // Jinhan Wu, A0266075Y: validate response shape + record absolute drift vs baseline
  const res = http.get(url);
  const body = parseJsonOrNull(res);
  const ok = validateFn(res, body);

  // Jinhan Wu, A0266075Y: k6 check - DB-backed endpoints return expected response shape
  check(res, {
    [`${url} status is 200`]: (r) => r.status === 200,
    [`${url} body is valid`]: () => ok,
  });

  coreDbErrorRate.add(!ok);

  // Record absolute latency drift from baseline.
  if (typeof baselineMs === "number") {
    const drift = Math.abs(res.timings.duration - baselineMs);
    dbResponseTimeDriftMs.add(drift);
  }

  return ok;
}

export default function (data) {
  // Hit all DB-backed endpoints each iteration to verify sustained responsiveness.
  driftAndValidate(
    PRODUCT_LIST_URL,
    data.baselineMs.productList,
    (res, body) => body && res.status === 200 && body.success === true && Array.isArray(body.products)
  );

  driftAndValidate(
    PRODUCT_COUNT_URL,
    data.baselineMs.productCount,
    (res, body) =>
      body && res.status === 200 && body.success === true && typeof body.total === "number"
  );

  driftAndValidate(
    CATEGORY_LIST_URL,
    data.baselineMs.categoryList,
    (res, body) => body && res.status === 200 && body.success === true && Array.isArray(body.category)
  );

  sleep(PAUSE_SECONDS);
}


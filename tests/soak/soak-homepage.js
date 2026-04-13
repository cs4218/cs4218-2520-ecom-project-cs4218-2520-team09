/**
 * Homepage Soak Test (k6)
 * Author: Jinhan Wu, A0266075Y
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Homepage public data endpoints (driven by client/src/pages/Homepage.js)
// Jinhan Wu, A0266075Y
const PRODUCT_LIST_URL = `${BASE_URL}/api/v1/product/product-list/1`;
const PRODUCT_COUNT_URL = `${BASE_URL}/api/v1/product/product-count`;
const CATEGORY_LIST_URL = `${BASE_URL}/api/v1/category/get-category`;

// Ramp up to TARGET_VUS in 1m, hold 30m, ramp down in 1m.
const TARGET_VUS = Number(__ENV.TARGET_VUS || 25);
const PAUSE_SECONDS = Number(__ENV.PAUSE_SECONDS || 1);
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || "1m";
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || "1m";

const homepageErrorRate = new Rate("homepage_error_rate"); // ratio of endpoint failures

const productListDuration = new Trend("homepage_product_list_duration", true);
const productCountDuration = new Trend("homepage_product_count_duration", true);
const categoryListDuration = new Trend("homepage_category_list_duration", true);

export const options = {
  scenarios: {
    homepage_soak: {
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
    // Global request duration p95
    http_req_duration: ["p(95)<500"],
    // Error rate across all homepage endpoint checks
    homepage_error_rate: ["rate<0.01"],
    // Route-specific 95th percentile checks
    homepage_product_list_duration: ["p(95)<500"],
    homepage_product_count_duration: ["p(95)<500"],
    homepage_category_list_duration: ["p(95)<500"],
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

function getWithValidation(url, validateFn, kind, durationTrend) {
  // Jinhan Wu, A0266075Y: per-endpoint validation + metrics collection
  const res = http.get(url);
  const body = parseJsonOrNull(res);

  const ok = validateFn(res, body);

  // Jinhan Wu, A0266075Y: k6 check - public endpoint returns expected body shape
  check(res, {
    [`${kind} status is 200`]: (r) => r.status === 200,
    [`${kind} body shape is valid`]: () => ok,
  });

  homepageErrorRate.add(!ok);
  durationTrend.add(res.timings.duration);

  return ok;
}

export default function () {
  const okProductList = getWithValidation(
    PRODUCT_LIST_URL,
    (res, body) =>
      res.status === 200 &&
      body &&
      body.success === true &&
      Array.isArray(body.products),
    "product-list",
    productListDuration
  );

  const okProductCount = getWithValidation(
    PRODUCT_COUNT_URL,
    (res, body) =>
      res.status === 200 &&
      body &&
      body.success === true &&
      typeof body.total === "number",
    "product-count",
    productCountDuration
  );

  const okCategoryList = getWithValidation(
    CATEGORY_LIST_URL,
    (res, body) =>
      res.status === 200 &&
      body &&
      body.success === true &&
      Array.isArray(body.category),
    "get-category",
    categoryListDuration
  );

  sleep(PAUSE_SECONDS);
}


/**
 * Components Soak Test (k6)
 * Author: Jinhan Wu, A0266075Y
 */

import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

const LOGIN_URL = `${BASE_URL}/api/v1/auth/login`;

const CATEGORY_URL = `${BASE_URL}/api/v1/category/get-category`;
const USER_AUTH_URL = `${BASE_URL}/api/v1/auth/user-auth`;

// Credentials for obtaining a JWT.
// Uses TEST_AUTH_EMAIL/PASSWORD if provided; otherwise falls back to TEST_ADMIN_EMAIL/PASSWORD.
const TEST_AUTH_EMAIL = __ENV.TEST_AUTH_EMAIL || __ENV.TEST_ADMIN_EMAIL;
const TEST_AUTH_PASSWORD = __ENV.TEST_AUTH_PASSWORD || __ENV.TEST_ADMIN_PASSWORD;

const TARGET_VUS = Number(__ENV.TARGET_VUS || 25);
const PAUSE_SECONDS = Number(__ENV.PAUSE_SECONDS || 1);
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || "1m";
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || "1m";

function parseJsonOrNull(res) {
  try {
    return res.json();
  } catch (_) {
    return null;
  }
}

function authHeaderBearer(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function authHeaderRaw(token) {
  return {
    Authorization: token,
    "Content-Type": "application/json",
  };
}

const componentErrorRate = new Rate("component_error_rate");
const categoryDuration = new Trend("component_category_duration", true);
const userAuthDuration = new Trend("component_user_auth_duration", true);

export const options = {
  scenarios: {
    components_soak: {
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
    // Public endpoints should remain responsive under soak.
    http_req_duration: ["p(95)<500"],
    component_error_rate: ["rate<0.01"],
  },
  summaryTimeUnit: "ms",
  discardResponseBodies: false,
};

function loginAndGetToken() {
  if (!TEST_AUTH_EMAIL || !TEST_AUTH_PASSWORD) {
    // Missing credentials should not crash the test run; it will be recorded as failed auth checks.
    return null;
  }

  const payload = JSON.stringify({
    email: TEST_AUTH_EMAIL,
    password: TEST_AUTH_PASSWORD,
  });

  const res = http.post(LOGIN_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const body = parseJsonOrNull(res);
  const ok = check(res, {
    "login status is 200": (r) => r.status === 200,
    "login returns success=true": () => body && body.success === true,
    "login returns token": () => body && typeof body.token === "string" && body.token.length > 0,
  });

  if (!ok) return null;
  return body.token;
}

function validateCategory() {
  const res = http.get(CATEGORY_URL);
  const body = parseJsonOrNull(res);

  const ok =
    res.status === 200 &&
    body &&
    body.success === true &&
    Array.isArray(body.category);

  check(res, {
    "category status is 200": (r) => r.status === 200,
    "category response has category array": () => ok,
  });

  componentErrorRate.add(!ok);
  categoryDuration.add(res.timings.duration);

  return ok;
}

function validateUserAuth(token) {
  // Retry once if the backend expects raw JWT string instead of Bearer prefix.
  let headers = authHeaderBearer(token);
  let res = http.get(USER_AUTH_URL, { headers });

  if (res.status === 401) {
    headers = authHeaderRaw(token);
    res = http.get(USER_AUTH_URL, { headers });
  }

  const body = parseJsonOrNull(res);
  const ok = res.status === 200 && body && body.ok === true && Object.keys(body).length === 1;

  check(res, {
    "user-auth status is 200": (r) => r.status === 200,
    "user-auth returns { ok: true }": () => ok,
  });

  componentErrorRate.add(!ok);
  userAuthDuration.add(res.timings.duration);

  return ok;
}

export function setup() {
  const token = loginAndGetToken();
  return { token: token || null };
}

export default function (data) {
  // Mix order to simulate different component render sequences.
  const firstIsCategory = Math.random() < 0.5;

  if (firstIsCategory) {
    validateCategory();
    validateUserAuth(data.token);
  } else {
    validateUserAuth(data.token);
    validateCategory();
  }

  sleep(PAUSE_SECONDS);
}


/**
 * Protected Routes Soak Test (k6)
 * Author: Jinhan Wu, A0266075Y
 */

import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Protected route endpoints
const USER_AUTH_URL = `${BASE_URL}/api/v1/auth/user-auth`;
const ADMIN_AUTH_URL = `${BASE_URL}/api/v1/auth/admin-auth`;

// Auth endpoints (login + optional register fallback for USER)
const LOGIN_URL = `${BASE_URL}/api/v1/auth/login`;
const REGISTER_URL = `${BASE_URL}/api/v1/auth/register`;

// Credentials for login. You can override via env vars.
const USER_EMAIL = __ENV.USER_EMAIL || "protected-routes-user@example.com";
const USER_PASSWORD = __ENV.USER_PASSWORD || "correct-password-123";
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || "protected-routes-admin@example.com";
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || "correct-password-123";

// Load profile: ramp to TARGET_VUS in 1 minute, soak 30 minutes, ramp down in 1 minute.
const TARGET_VUS = Number(__ENV.TARGET_VUS || 25);
const PAUSE_SECONDS = Number(__ENV.PAUSE_SECONDS || 1);
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || "1m";
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || "1m";

// The server middleware expects the raw JWT string in `Authorization`.
// This test sends `Bearer <token>` by default (per spec) and retries once with raw token on 401.
const AUTH_HEADER_MODE = String(__ENV.AUTH_HEADER_MODE || "bearer").toLowerCase(); // "bearer" | "raw"

const protectedErrorRate = new Rate("protected_error_rate"); // ratio of failed protected requests

// Response degradation tracking (route-specific)
const protectedUserAuthDuration = new Trend("protected_user_auth_duration", true);
const protectedAdminAuthDuration = new Trend("protected_admin_auth_duration", true);
const protectedUserAuthBodySize = new Trend("protected_user_auth_body_size");
const protectedAdminAuthBodySize = new Trend("protected_admin_auth_body_size");

export const options = {
  scenarios: {
    protected_routes_soak: {
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
    // Global request duration threshold (includes the single setup login phase).
    http_req_duration: ["p(95)<500"],
    // Error rate threshold for protected endpoints (user-auth + admin-auth).
    protected_error_rate: ["rate<0.01"],
    // Route-specific 95th percentile thresholds.
    protected_user_auth_duration: ["p(95)<500"],
    protected_admin_auth_duration: ["p(95)<500"],
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

function authHeaderValue(token) {
  if (AUTH_HEADER_MODE === "raw") return token;
  return `Bearer ${token}`;
}

function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const res = http.post(LOGIN_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });

  const body = parseJsonOrNull(res);
  const ok = check(res, {
    "login status is 200": (r) => r.status === 200,
    "login returns success=true": () => body && body.success === true,
    "login returns a token string": () => body && typeof body.token === "string" && body.token.length > 0,
  });

  return {
    token: ok && body ? body.token : null,
    status: res.status,
    body,
  };
}

function register(email, password) {
  // registerController requires: name, email, password, phone, address, answer
  const payload = JSON.stringify({
    name: __ENV.REGISTER_NAME || "k6 soak user",
    email,
    password,
    phone: __ENV.REGISTER_PHONE || "5550100",
    address: __ENV.REGISTER_ADDRESS || "1 Test Street",
    answer: __ENV.REGISTER_ANSWER || "secret-answer",
  });
  return http.post(REGISTER_URL, payload, {
    headers: { "Content-Type": "application/json" },
  });
}

function loginOrRegisterUser(email, password) {
  // Per requirement: start with login first.
  const initialLogin = login(email, password);
  if (initialLogin.token) return initialLogin.token;

  // If the user doesn't exist, register and retry login once.
  register(email, password);
  const retryLogin = login(email, password);
  return retryLogin.token;
}

export function setup() {
  const userToken = loginOrRegisterUser(USER_EMAIL, USER_PASSWORD);
  const adminLogin = login(ADMIN_EMAIL, ADMIN_PASSWORD);

  return { userToken, adminToken: adminLogin.token };
}

function callProtectedAndValidate(url, token, kind) {
  // First attempt: send Bearer-prefixed token (spec), then retry once with raw token on 401.
  let headers = {
    Authorization: authHeaderValue(token),
    "Content-Type": "application/json",
  };
  let res = http.get(url, { headers });

  if (res.status === 401 && AUTH_HEADER_MODE !== "raw") {
    headers = {
      ...headers,
      Authorization: token, // server expects raw JWT string
    };
    res = http.get(url, { headers });
  }

  const body = parseJsonOrNull(res);
  const ok =
    res.status === 200 &&
    body &&
    body.ok === true &&
    Object.keys(body).length === 1; // expected shape: { ok: true }

  // Checks for HTTP 200 and correct response body
  check(res, {
    [`${kind} status is 200`]: (r) => r.status === 200,
    [`${kind} body is { ok: true }`]: () => ok,
  });

  protectedErrorRate.add(!ok);

  if (kind === "user") {
    protectedUserAuthDuration.add(res.timings.duration);
    protectedUserAuthBodySize.add(res.body ? res.body.length : 0);
  } else {
    protectedAdminAuthDuration.add(res.timings.duration);
    protectedAdminAuthBodySize.add(res.body ? res.body.length : 0);
  }

  return ok;
}

export default function (tokens) {
  // Each iteration sends both protected endpoints using the same valid JWT tokens.
  callProtectedAndValidate(USER_AUTH_URL, tokens.userToken, "user");
  callProtectedAndValidate(ADMIN_AUTH_URL, tokens.adminToken, "admin");

  // Small pacing to keep "moderate load" stable over time.
  sleep(PAUSE_SECONDS);
}


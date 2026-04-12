/**
 * Admin View Users Soak Test (k6)
 * Author: Jinhan Wu, A0266075Y
 */

import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

const ADMIN_USERS_ENDPOINT_OVERRIDE = __ENV.ADMIN_USERS_ENDPOINT;

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (String(pathOrUrl).startsWith("http://") || String(pathOrUrl).startsWith("https://"))
    return String(pathOrUrl);
  return `${BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

const LOGIN_URL = `${BASE_URL}/api/v1/auth/login`;

const TEST_ADMIN_EMAIL = __ENV.TEST_ADMIN_EMAIL;
const TEST_ADMIN_PASSWORD = __ENV.TEST_ADMIN_PASSWORD;

// Ramp up to ~25 VUs over 1m, hold for 30m, ramp down over 1m.
const TARGET_VUS = Number(__ENV.TARGET_VUS || 25);
const PAUSE_SECONDS = Number(__ENV.PAUSE_SECONDS || 1);
const RAMP_UP_DURATION = __ENV.RAMP_UP_DURATION || "1m";
const SOAK_DURATION = __ENV.SOAK_DURATION || "30m";
const RAMP_DOWN_DURATION = __ENV.RAMP_DOWN_DURATION || "1m";

// Backend middleware expects raw JWT in `Authorization`.
// This test sends `Bearer <token>` first (per spec) and retries once with the raw token.
function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function authHeadersRaw(token) {
  return {
    Authorization: token,
    "Content-Type": "application/json",
  };
}

const adminUsersErrorRate = new Rate("admin_users_error_rate");
const adminUsersDuration = new Trend("admin_users_duration", true);

export const options = {
  scenarios: {
    admin_users_soak: {
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
    admin_users_duration: ["p(95)<500"],
    admin_users_error_rate: ["rate<0.01"],
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

function loginAdmin() {
  if (!TEST_ADMIN_EMAIL || !TEST_ADMIN_PASSWORD) {
    return null;
  }

  const payload = JSON.stringify({
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
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

function getAdminUsers(token, adminUsersUrl) {
  let headers = authHeaders(token);
  let res = http.get(adminUsersUrl, { headers });

  if (res.status === 401) {
    headers = authHeadersRaw(token);
    res = http.get(adminUsersUrl, { headers });
  }

  const body = parseJsonOrNull(res);
  const usersArray = body && Array.isArray(body.users) ? body.users : null;

  const ok = check(res, {
    "admin users status is 200": (r) => r.status === 200,
    "admin users response has users array": () => usersArray,
  });

  adminUsersErrorRate.add(!ok);
  adminUsersDuration.add(res.timings.duration);

  return ok;
}

export function setup() {
  const token = loginAdmin();
  if (!token) {
    // MongoDB/auth issues: fall back to a default endpoint and continue without a valid JWT.
    return {
      token: null,
      adminUsersUrl: toAbsoluteUrl(
        ADMIN_USERS_ENDPOINT_OVERRIDE || "/api/v1/auth/all-users"
      ),
    };
  }

  const candidateEndpoints = [
    ADMIN_USERS_ENDPOINT_OVERRIDE,
    "/api/v1/auth/all-users",
    "/api/v1/auth/users",
    "/api/v1/auth/admin-users",
    "/api/v1/auth/get-all-users",
    "/api/v1/auth/get-users",
  ].filter(Boolean);

  const seen = new Set();
  const uniqueCandidates = candidateEndpoints.filter((c) => {
    const k = String(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let selectedUrl = null;

  for (const candidate of uniqueCandidates) {
    const url = toAbsoluteUrl(candidate);

    let headers = authHeaders(token);
    let res = http.get(url, { headers });

    if (res.status === 401) {
      headers = authHeadersRaw(token);
      res = http.get(url, { headers });
    }

    if (res.status === 200) {
      const body = parseJsonOrNull(res);
      if (body && Array.isArray(body.users)) {
        selectedUrl = url;
        break;
      }
    }
  }

  // If probing can't find a matching endpoint, fall back to the default candidate.
  const fallbackUrl = toAbsoluteUrl(
    ADMIN_USERS_ENDPOINT_OVERRIDE || "/api/v1/auth/all-users"
  );
  return { token, adminUsersUrl: selectedUrl || fallbackUrl };
}

export default function (data) {
  getAdminUsers(data.token, data.adminUsersUrl);
  sleep(PAUSE_SECONDS);
}


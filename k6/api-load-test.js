import { check, sleep } from "k6";
import http from "k6/http";
import { Counter } from "k6/metrics";
import { config } from "./config/local-config.js";

const productRequests = new Counter("product_requests");
const loginRequests = new Counter("login_requests");

export const options = {
  scenarios: {
    browse_products: {
      executor: "ramping-vus",
      exec: "browseProducts",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 10 },
        { duration: "15s", target: 10 },
        { duration: "15s", target: 20 },
        { duration: "15s", target: 0 },
      ],
    },

    // Login scenario disabled for isolated product load testing.
  },

  thresholds: {
    "http_req_duration{endpoint:products}": ["p(95)<200"],
    // "http_req_duration{endpoint:login}": ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>=0.99"],
  },
};

export function browseProducts() {
  const response = http.get(`${config.baseUrl}/api/Products`, {
    tags: { endpoint: "products" },
  });
  productRequests.add(1);

  check(response, {
    "status is 200": (r) => r.status === 200,
  });

  sleep(1);
}

export function loginUser() {
  const loginPayload = JSON.stringify({
    email: config.testUser.email,
    password: config.testUser.password,
  });
  loginRequests.add(1);

  const loginParams = {
    headers: {
      "Content-Type": "application/json",
    },
    tags: { endpoint: "login" },
  };

  const loginResponse = http.post(
    `${config.baseUrl}/rest/user/login`,
    loginPayload,
    loginParams,
  );

  check(loginResponse, {
    "login status is 200": (r) => r.status === 200,
  });

  sleep(1);
}

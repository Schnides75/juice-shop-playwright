import { check, sleep } from "k6";
import http from "k6/http";
import { config } from "./config/local-config.js";

export const options = {
  vus: 10,
  duration: "10s",

  thresholds: {
    "http_req_duration{endpoint:products}": ["p(95)<200"],
    "http_req_duration{endpoint:login}": ["p(95)<200"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const response = http.get(`${config.baseUrl}/api/Products`, {
    tags: { endpoint: "products" },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,
  });

  const loginPayload = JSON.stringify({
    email: config.testUser.email,
    password: config.testUser.password,
  });

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

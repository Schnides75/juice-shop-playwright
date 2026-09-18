import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  vus: 10,
  duration: "10s",
};

export default function () {
  const response = http.get("http://localhost:3000");

  check(response, {
    "status is 200": (r) => r.status === 200,
  });

  sleep(1);
}

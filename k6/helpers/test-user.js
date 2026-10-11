import { check } from "k6";
import http from "k6/http";

export function getTestUser() {
  return {
    email: "testing@juice-sh.op",
    password: "IamUsedForTesting",
  };
}

const params = {
  headers: {
    "Content-Type": "application/json",
  },
};

const response = http.post("http://localhost:3000/api/Users", payload, params);

check(response, {
  "user created": (r) => r.status === 201,
});

console.log(`Create user status: ${response.status}`);
console.log(`Create user body: ${response.body}`);

return {
  email: email,
  password: password,
};

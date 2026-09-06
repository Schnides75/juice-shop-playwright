import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

const password = "ApiTest123!";

type AuthSession = {
  email: string;
  token: string;
  basketId: number;
  userId: number;
};

type RequestOptions = NonNullable<Parameters<APIRequestContext["fetch"]>[1]>;

const maxLogLength = 750;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        /authorization|password|token/i.test(key)
          ? "[REDACTED]"
          : redact(nestedValue),
      ]),
    );
  }
  return value;
}

function formatLogValue(value: unknown) {
  const formatted =
    typeof value === "string" ? value : JSON.stringify(redact(value));
  return formatted.length > maxLogLength
    ? `${formatted.slice(0, maxLogLength)}... [truncated]`
    : formatted;
}

function usefulResponseBody(value: unknown): unknown {
  if (typeof value === "string") {
    const errorHeading = value.match(/<h2>(.*?)<\/h2>/s)?.[1];
    return errorHeading
      ? errorHeading
          .replace(/<[^>]+>/g, "")
          .replaceAll("&quot;", '"')
          .replaceAll("&#39;", "'")
          .trim()
      : value.trim();
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const body = redact(value) as Record<string, unknown>;
    if (Array.isArray(body.data)) {
      return {
        ...body,
        data: {
          count: body.data.length,
          sample: body.data[0],
        },
      };
    }
    return body;
  }

  return redact(value);
}

async function sendRequest(
  request: APIRequestContext,
  method: "GET" | "POST",
  url: string,
  options: RequestOptions = {},
) {
  const requestDetails = Object.fromEntries(
    Object.entries({
      params: options.params,
      headers: options.headers,
      data: options.data,
    }).filter(([, value]) => value !== undefined),
  );
  const requestSuffix = Object.keys(requestDetails).length
    ? ` ${formatLogValue(requestDetails)}`
    : "";
  console.log(`\n[API] → ${method} ${url}${requestSuffix}`);

  const response = await request.fetch(url, { ...options, method });
  const responseText = await response.text();
  let responseBody: unknown = responseText;

  if (response.headers()["content-type"]?.includes("application/json")) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Keep the raw body when a response claims to be JSON but is malformed.
    }
  }

  console.log(
    `[API] ← ${response.status()} ${response.statusText()} ${formatLogValue(usefulResponseBody(responseBody))}`,
  );
  return response;
}

async function expectJson(response: APIResponse, status: number) {
  expect(response.status()).toBe(status);
  expect(response.headers()["content-type"]).toContain("application/json");
  return response.json();
}

function authorization(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function registerUser(request: APIRequestContext) {
  const email = `api-${randomUUID()}@example.test`;
  const response = await sendRequest(request, "POST", "/api/Users", {
    data: { email, password, passwordRepeat: password },
  });
  const body = await expectJson(response, 201);

  expect(body).toMatchObject({
    status: "success",
    data: { email, role: "customer" },
  });
  expect(body.data.id).toEqual(expect.any(Number));
  expect(body.data).not.toHaveProperty("password");

  return { email, userId: body.data.id as number };
}

async function createAuthenticatedUser(
  request: APIRequestContext,
): Promise<AuthSession> {
  const { email, userId } = await registerUser(request);
  const response = await sendRequest(request, "POST", "/rest/user/login", {
    data: { email, password },
  });
  const body = await expectJson(response, 200);

  expect(body.authentication).toMatchObject({
    token: expect.any(String),
    bid: expect.any(Number),
    umail: email,
  });

  return {
    email,
    userId,
    token: body.authentication.token,
    basketId: body.authentication.bid,
  };
}

async function firstProductId(request: APIRequestContext): Promise<number> {
  const response = await sendRequest(request, "GET", "/api/Products");
  const body = await expectJson(response, 200);
  expect(body.data.length).toBeGreaterThan(0);
  return body.data[0].id;
}

async function addItemToBasket(
  request: APIRequestContext,
  session: AuthSession,
) {
  const productId = await firstProductId(request);
  const response = await sendRequest(request, "POST", "/api/BasketItems", {
    headers: authorization(session.token),
    data: {
      ProductId: productId,
      BasketId: session.basketId,
      quantity: 1,
    },
  });
  const body = await expectJson(response, 200);
  expect(body).toMatchObject({
    status: "success",
    data: {
      ProductId: productId,
      BasketId: session.basketId,
      quantity: 1,
    },
  });
  return body.data;
}

async function placeOrder(request: APIRequestContext) {
  const session = await createAuthenticatedUser(request);
  await addItemToBasket(request, session);

  const response = await sendRequest(
    request,
    "POST",
    `/rest/basket/${session.basketId}/checkout`,
    {
      headers: authorization(session.token),
      data: { orderDetails: {} },
    },
  );
  const body = await expectJson(response, 200);
  expect(body.orderConfirmation).toMatch(/^[a-f\d]{4}-[a-f\d]{16}$/i);

  return { ...session, orderId: body.orderConfirmation as string };
}

test.describe("GET /api/Products", () => {
  test("returns the product catalogue", async ({ request }) => {
    const response = await sendRequest(request, "GET", "/api/Products");
    const body = await expectJson(response, 200);

    expect(body.status).toBe("success");
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        description: expect.any(String),
        price: expect.any(Number),
      }),
    );
  });

  test("returns 404 for an invalid product id", async ({ request }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/api/Products/not-a-number",
    );
    const body = await expectJson(response, 404);
    expect(body).toEqual({ message: "Not Found", errors: [] });
  });
});

test.describe("GET /rest/products/search", () => {
  test("returns products matching apple", async ({ request }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/rest/products/search",
      {
      params: { q: "apple" },
      },
    );
    const body = await expectJson(response, 200);

    expect(body.status).toBe("success");
    expect(body.data.length).toBeGreaterThan(0);
    for (const product of body.data) {
      expect(`${product.name} ${product.description}`).toMatch(/apple/i);
    }
  });

  test("returns an error for a non-string search parameter", async ({
    request,
  }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/rest/products/search?q%5Binvalid%5D=apple",
    );
    expect(response.status()).toBe(500);
    expect(await response.text()).toContain(
      "criteria.substring is not a function",
    );
  });
});

test.describe("POST /rest/user/login", () => {
  test("authenticates a registered user", async ({ request }) => {
    const session = await createAuthenticatedUser(request);

    expect(session.token.length).toBeGreaterThan(0);
    expect(session.basketId).toBeGreaterThan(0);
  });

  test("rejects invalid credentials", async ({ request }) => {
    const response = await sendRequest(request, "POST", "/rest/user/login", {
      data: {
        email: `missing-${randomUUID()}@example.test`,
        password: "wrong-password",
      },
    });

    expect(response.status()).toBe(401);
    expect(await response.text()).toContain("Invalid email or password");
  });
});

test.describe("POST /api/Users", () => {
  test("registers a new customer", async ({ request }) => {
    await registerUser(request);
  });

  test("rejects a duplicate email address", async ({ request }) => {
    const { email } = await registerUser(request);
    const response = await sendRequest(request, "POST", "/api/Users", {
      data: { email, password, passwordRepeat: password },
    });

    expect(response.status()).toBe(400);
    expect(await response.text()).toMatch(/unique|already exists/i);
  });
});

test.describe("GET /api/SecurityQuestions", () => {
  test("returns reference security questions", async ({ request }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/api/SecurityQuestions",
    );
    const body = await expectJson(response, 200);

    expect(body.status).toBe("success");
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        question: expect.any(String),
      }),
    );
  });

  test("rejects attempts to create a security question", async ({
    request,
  }) => {
    const response = await sendRequest(
      request,
      "POST",
      "/api/SecurityQuestions",
      {
      data: { question: "Invalid question" },
      },
    );
    expect(response.status()).toBe(401);
    expect(await response.text()).toContain("UnauthorizedError");
  });
});

test.describe("GET /rest/basket/:id", () => {
  test("returns the authenticated user's basket", async ({ request }) => {
    const session = await createAuthenticatedUser(request);
    const response = await sendRequest(
      request,
      "GET",
      `/rest/basket/${session.basketId}`,
      { headers: authorization(session.token) },
    );
    const body = await expectJson(response, 200);

    expect(body).toMatchObject({
      status: "success",
      data: {
        id: session.basketId,
        UserId: session.userId,
        Products: [],
      },
    });
  });

  test("rejects a request without authentication", async ({ request }) => {
    const response = await sendRequest(request, "GET", "/rest/basket/1");
    expect(response.status()).toBe(401);
    expect(await response.text()).toContain("No Authorization header");
  });
});

test.describe("POST /api/BasketItems", () => {
  test("adds a product to the authenticated user's basket", async ({
    request,
  }) => {
    const session = await createAuthenticatedUser(request);
    const item = await addItemToBasket(request, session);
    expect(item.id).toEqual(expect.any(Number));
  });

  test("rejects a request without authentication", async ({ request }) => {
    const response = await sendRequest(request, "POST", "/api/BasketItems", {
      data: { ProductId: 1, BasketId: 1, quantity: 1 },
    });
    expect(response.status()).toBe(401);
    expect(await response.text()).toContain("No Authorization header");
  });
});

test.describe("POST /rest/basket/:id/checkout", () => {
  test("checks out a populated basket", async ({ request }) => {
    const order = await placeOrder(request);
    expect(order.orderId).toMatch(/^[a-f\d]{4}-[a-f\d]{16}$/i);
  });

  test("rejects a request without authentication", async ({ request }) => {
    const response = await sendRequest(
      request,
      "POST",
      "/rest/basket/1/checkout",
      { data: { orderDetails: {} } },
    );
    expect(response.status()).toBe(401);
    expect(await response.text()).toContain("No Authorization header");
  });
});

test.describe("GET /rest/order-history", () => {
  test("returns orders belonging to the authenticated user", async ({
    request,
  }) => {
    const order = await placeOrder(request);
    const response = await sendRequest(
      request,
      "GET",
      "/rest/order-history",
      { headers: authorization(order.token) },
    );
    const body = await expectJson(response, 200);

    expect(body.status).toBe("success");
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orderId: order.orderId }),
      ]),
    );
  });

  test("rejects a request without authentication", async ({ request }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/rest/order-history",
    );
    expect(response.status()).toBe(500);
    expect(await response.text()).toContain("Blocked illegal activity");
  });
});

test.describe("GET /rest/track-order/:id", () => {
  test("returns tracking data for an existing order", async ({ request }) => {
    const order = await placeOrder(request);
    const response = await sendRequest(
      request,
      "GET",
      `/rest/track-order/${order.orderId}`,
    );
    const body = await expectJson(response, 200);

    expect(body.status).toBe("success");
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orderId: order.orderId }),
      ]),
    );
  });

  test("returns an error for a malformed order id", async ({ request }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/rest/track-order/%27",
    );
    expect(response.status()).toBe(500);
    expect(await response.text()).toContain("SyntaxError");
  });
});

test.describe("GET /rest/wallet/balance", () => {
  test("returns the authenticated user's wallet balance", async ({
    request,
  }) => {
    const session = await createAuthenticatedUser(request);
    const response = await sendRequest(
      request,
      "GET",
      "/rest/wallet/balance",
      { headers: authorization(session.token) },
    );
    const body = await expectJson(response, 200);

    expect(body).toEqual({ status: "success", data: 0 });
  });

  test("rejects a request without authentication", async ({ request }) => {
    const response = await sendRequest(
      request,
      "GET",
      "/rest/wallet/balance",
    );
    const body = await expectJson(response, 401);
    expect(body).toMatchObject({ status: "error" });
  });
});

test.describe("GET /api/Challenges", () => {
  test("returns Juice Shop challenge data", async ({ request }) => {
    const response = await sendRequest(request, "GET", "/api/Challenges");
    const body = await expectJson(response, 200);

    expect(body.status).toBe("success");
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        key: expect.any(String),
        name: expect.any(String),
        difficulty: expect.any(Number),
        solved: expect.any(Boolean),
      }),
    );
  });

  test("rejects attempts to create a challenge", async ({ request }) => {
    const response = await sendRequest(request, "POST", "/api/Challenges", {
      data: {
        key: "invalidChallenge",
        name: "Invalid challenge",
        difficulty: 1,
      },
    });
    expect(response.status()).toBe(401);
    expect(await response.text()).toContain("UnauthorizedError");
  });
});

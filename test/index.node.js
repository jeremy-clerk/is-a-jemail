import assert from "node:assert/strict";
import { test } from "node:test";
import { isEmail } from "is-a-jemail";

const options = { apiKey: "test-key" };
const openRouterOptions = { provider: "openrouter", apiKey: "openrouter-test-key" };

test("sends the documented TypeSafe request and forwards the abort signal", async (t) => {
  const signal = new AbortController().signal;
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(init.method, "POST");
    assert.deepEqual(init.headers, {
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    assert.equal(init.signal, signal);
    assert.deepEqual(JSON.parse(init.body), {
      model: "jev-latest",
      state: { email: "jev@example.com" },
      questions: {
        category: {
          type: "choice",
          instructions: "Is this an email address?",
          criteria: { true: null, false: null },
        },
      },
    });

    return Response.json({
      answers: { category: { type: "choice", choice: "true" } },
    });
  });

  assert.equal(await isEmail("jev@example.com", { ...options, signal }), true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("supports Jev through OpenRouter's Decisions API", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
    assert.equal(init.method, "POST");
    assert.deepEqual(init.headers, {
      Authorization: "Bearer openrouter-test-key",
      "Content-Type": "application/json",
    });
    assert.deepEqual(JSON.parse(init.body), {
      model: "typesafe/jev-1.13",
      state: { email: "jev@example.com" },
      questions: {
        category: {
          type: "choice",
          instructions: "Is this an email address?",
          criteria: { true: null, false: null },
        },
      },
    });

    return Response.json({
      answers: { category: { type: "choice", choice: "true" } },
    });
  });

  assert.equal(await isEmail("jev@example.com", openRouterOptions), true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("returns Jev's verdict without second-guessing it locally", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      answers: { category: { type: "choice", choice: "false" } },
    }),
  );

  assert.equal(await isEmail("jev@example.com", options), false);
});

test("lets Jev judge the format instead of applying a local email regex", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      answers: { category: { type: "choice", choice: "true" } },
    }),
  );

  assert.equal(await isEmail("probably not an email", options), true);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("rejects invalid inputs and missing keys before making a request", async (t) => {
  const previousKey = process.env.TYPESAFE_API_KEY;
  const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
  delete process.env.TYPESAFE_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  t.after(() => {
    if (previousKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = previousKey;
    if (previousOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
  });

  const fetchMock = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Should not reach the network");
  });

  for (const email of ["", "  ", null, undefined, 42, {}]) {
    await assert.rejects(isEmail(email, options), /non-empty string/);
  }

  for (const apiKey of [undefined, "", "  "]) {
    await assert.rejects(isEmail("jev@example.com", { apiKey }), /API key is required/);
  }

  await assert.rejects(isEmail("jev@example.com"), /API key is required/);
  await assert.rejects(
    isEmail("jev@example.com", { provider: "openrouter" }),
    /OPENROUTER_API_KEY/,
  );
  await assert.rejects(
    isEmail("jev@example.com", { provider: "somewhere-else", apiKey: "test-key" }),
    /Unknown Jev provider/,
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("reads the environment at call time and allows explicit key overrides", async (t) => {
  const previousKey = process.env.TYPESAFE_API_KEY;
  t.after(() => {
    if (previousKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = previousKey;
  });

  const keys = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    keys.push(init.headers.Authorization);
    return Response.json({
      answers: { category: { type: "choice", choice: "true" } },
    });
  });

  process.env.TYPESAFE_API_KEY = "environment-key";
  assert.equal(await isEmail("jev@example.com"), true);
  process.env.TYPESAFE_API_KEY = "updated-key";
  assert.equal(await isEmail("jev@example.com"), true);
  assert.equal(await isEmail("jev@example.com", options), true);
  assert.deepEqual(keys, ["Bearer environment-key", "Bearer updated-key", "Bearer test-key"]);
});

test("reads the OpenRouter key from the environment at call time", async (t) => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  t.after(() => {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  });

  process.env.OPENROUTER_API_KEY = "openrouter-environment-key";
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    assert.equal(init.headers.Authorization, "Bearer openrouter-environment-key");
    return Response.json({
      answers: { category: { type: "choice", choice: "true" } },
    });
  });

  assert.equal(await isEmail("jev@example.com", { provider: "openrouter" }), true);
});

test("reports HTTP failures, including non-JSON responses", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response("Service unavailable", { status: 503 }),
  );

  await assert.rejects(
    isEmail("jev@example.com", options),
    /TypeSafe AI request failed \(503\)/,
  );
});

test("identifies OpenRouter HTTP failures", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response("Service unavailable", { status: 503 }),
  );

  await assert.rejects(
    isEmail("jev@example.com", openRouterOptions),
    /OpenRouter request failed \(503\)/,
  );
});

test("rejects missing or unexpected verdicts instead of returning false", async (t) => {
  for (const data of [
    null,
    {},
    { answers: { category: { type: "choice", choice: true } } },
    { answers: { category: { type: "choice", choice: "maybe" } } },
  ]) {
    const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json(data));
    await assert.rejects(isEmail("jev@example.com", options), /invalid email verdict/);
    fetchMock.mock.restore();
  }
});

test("propagates network errors and cancellation", async (t) => {
  const error = new DOMException("The operation was aborted", "AbortError");
  t.mock.method(globalThis, "fetch", async () => {
    throw error;
  });

  await assert.rejects(
    isEmail("jev@example.com", options),
    (cause) => cause === error,
  );
});

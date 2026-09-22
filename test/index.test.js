import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { isEmail } from "is-a-jemail";

afterEach(() => {
  mock.restore();
});

test("runs the TypeSafe request with Bun's fetch implementation", async () => {
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
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

  await expect(isEmail("jev@example.com", { apiKey: "test-key" })).resolves.toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("runs the OpenRouter request with Bun's fetch implementation", async () => {
  const fetchMock = spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    expect(url).toBe("https://openrouter.ai/api/alpha/decisions");
    expect(init?.headers).toEqual({
      Authorization: "Bearer openrouter-test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "typesafe/jev-1.13",
      state: { email: "jev@example.com" },
    });

    return Response.json({
      answers: { category: { type: "choice", choice: "false" } },
    });
  });

  await expect(
    isEmail("jev@example.com", {
      provider: "openrouter",
      apiKey: "openrouter-test-key",
    }),
  ).resolves.toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("rejects malformed Jev responses under Bun", async () => {
  spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ answers: {} }));

  await expect(isEmail("jev@example.com", { apiKey: "test-key" })).rejects.toThrow(
    "invalid email verdict",
  );
});

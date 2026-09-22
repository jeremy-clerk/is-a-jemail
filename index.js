/**
 * Ask Jev whether a value is an email address.
 *
 * @param {string} email
 * @param {import('./index.js').IsEmailOptions} [options]
 * @returns {Promise<boolean>}
 */
export async function isEmail(email, options = {}) {
  const { signal } = options;

  if (typeof email !== "string" || !email.trim()) {
    throw new TypeError("Expected a non-empty string.");
  }

  const provider = getProvider(options.provider);
  const apiKey =
    options.apiKey ?? globalThis.process?.env?.[provider.environmentVariable];

  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new TypeError(
      `An ${provider.name} API key is required. Set ${provider.environmentVariable} or pass options.apiKey.`,
    );
  }

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      state: { email },
      questions: {
        category: {
          type: "choice",
          instructions: "Is this an email address?",
          criteria: { true: null, false: null },
        },
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`${provider.name} request failed (${response.status}).`);
  }

  /** @type {unknown} */
  const data = await response.json();
  return parseEmailVerdict(data, provider.name);
}

/**
 * @param {unknown} data
 * @param {string} providerName
 * @returns {boolean}
 */
function parseEmailVerdict(data, providerName) {
  if (!isRecord(data) || !isRecord(data.answers)) {
    throw new Error(`${providerName} returned an invalid email verdict.`);
  }

  const answer = data.answers.category;

  if (
    !isRecord(answer) ||
    answer.type !== "choice" ||
    (answer.choice !== "true" && answer.choice !== "false")
  ) {
    throw new Error(`${providerName} returned an invalid email verdict.`);
  }

  return answer.choice === "true";
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

/**
 * @param {import('./index.js').IsEmailProvider | undefined} provider
 */
function getProvider(provider) {
  switch (provider) {
    case undefined:
    case "typesafe":
      return {
        name: "TypeSafe AI",
        endpoint: "https://api.typesafe.ai/v1/systemone",
        model: "jev-latest",
        environmentVariable: "TYPESAFE_API_KEY",
      };
    case "openrouter":
      return {
        name: "OpenRouter",
        endpoint: "https://openrouter.ai/api/alpha/decisions",
        model: "typesafe/jev-1.13",
        environmentVariable: "OPENROUTER_API_KEY",
      };
    default:
      throw new TypeError(`Unknown Jev provider: ${provider}.`);
  }
}

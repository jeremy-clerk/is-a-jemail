export type IsEmailProvider = "typesafe" | "openrouter";

export interface IsEmailOptions {
  /** The service used to reach Jev. Defaults to direct TypeSafe access. */
  provider?: IsEmailProvider;
  /**
   * The selected provider's API key. Defaults to TYPESAFE_API_KEY or
   * OPENROUTER_API_KEY, depending on the provider.
   */
  apiKey?: string;
  /** Cancel the request or set a timeout with AbortSignal.timeout(ms). */
  signal?: AbortSignal;
}

/**
 * Ask Jev whether a non-empty string is an email address.
 *
 * Returns the model's verdict, which can be wrong. Each call makes one request
 * and sends the supplied value to TypeSafe AI or OpenRouter.
 *
 * Rejects on invalid input, a missing API key, or an API or network failure.
 */
export declare function isEmail(
  email: string,
  options?: IsEmailOptions,
): Promise<boolean>;

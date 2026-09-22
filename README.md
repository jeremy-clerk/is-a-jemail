# is-a-jemail

Is it an email? Ask Jev.

This package uses TypeSafe AI's Jev model to decide whether a string is an email address. It can call Jev directly or through OpenRouter. It has zero runtime dependencies and one job that absolutely did not need AI.

Inspired by [is-jeven](https://github.com/wobsoriano/is-jeven).

## Usage

For direct TypeSafe access, get an API key from the [TypeSafe console](https://console.typesafe.ai):

```sh
export TYPESAFE_API_KEY="your-typesafe-api-key"
```

```js
import { isEmail } from "is-a-jemail";

console.log(await isEmail("jev@example.com")); // true, probably
console.log(await isEmail("not an email")); // false, hopefully
```

For OpenRouter, create a key in [OpenRouter settings](https://openrouter.ai/settings/keys):

```sh
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

```js
console.log(
  await isEmail("jev@example.com", {
    provider: "openrouter",
  }),
);
```

Each call sends the supplied string to the selected provider. Do not use a real address if your privacy policy forbids sending it to a third party.

## API

### `isEmail(email, options?)`

Returns `Promise<boolean>` with Jev's verdict.

- `email` must be a non-empty string. Jev, not a local regular expression, judges its format.
- `options.provider` accepts `"typesafe"` or `"openrouter"`. It defaults to `"typesafe"`.
- `options.apiKey` overrides the selected provider's environment variable.
- `options.signal` accepts an `AbortSignal` for cancellation or a timeout.

```js
const result = await isEmail("jev@example.com", {
  provider: "openrouter",
  apiKey: "your-openrouter-api-key",
  signal: AbortSignal.timeout(5_000),
});
```

The OpenRouter route uses its Decisions API and the `typesafe/jev-1.13` model. Jev is not available through OpenRouter's chat-completions endpoint.

The model can be wrong. Do not use this package for authentication, authorization, account recovery, or proof that an inbox exists. This is a joke package.

## Development

With Node.js:

```sh
npm test
npm run typecheck
```

With Bun:

```sh
bun test
bun run typecheck
```

Run both runtime suites with `npm run test:all`.

## License

MIT

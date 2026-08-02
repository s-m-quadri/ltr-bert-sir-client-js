# @s-m-quadri/sir-client

TypeScript client and types for the [SIR ELSIE Space](https://huggingface.co/spaces/s-m-quadri/sir-elsie) API.

## Install

```bash
npm install @s-m-quadri/sir-client
# or
bun add @s-m-quadri/sir-client
pnpm add @s-m-quadri/sir-client
```

## Usage

```ts
import { createSirClient, DEFAULT_SIR_API_URL } from "@s-m-quadri/sir-client";

const sir = createSirClient();
console.log(await sir.health());

const results = await sir.search({
  query: "alice rabbit hole",
  mode: "blend",
  k: 10,
});
```

Local API:

```ts
const sir = createSirClient({ baseUrl: "http://127.0.0.1:8000" });
```

## Development

```bash
bun install
bun test
bun run build
```

## Repository layout

```text
sir-client-js/
├── .github/workflows/ci.yml
├── src/
│   ├── client.ts
│   ├── types.ts
│   └── index.ts
├── test/client.test.ts
├── package.json
├── tsconfig.json
└── LICENSE
```

## Publish

```bash
bunx npm login
bun publish --access public
```

License: Apache-2.0

# @s-m-quadri/ltr-bert-sir-client

TypeScript client for the [ltr-bert-sir](https://huggingface.co/s-m-quadri/ltr-bert-sir) ELSIE API ([sir-elsie Space](https://huggingface.co/spaces/s-m-quadri/sir-elsie)).

## Install

```bash
npm install @s-m-quadri/ltr-bert-sir-client
# or
bun add @s-m-quadri/ltr-bert-sir-client
pnpm add @s-m-quadri/ltr-bert-sir-client
```

## Usage

```ts
import { createSirClient, DEFAULT_SIR_API_URL } from "@s-m-quadri/ltr-bert-sir-client";

const sir = createSirClient();
console.log(await sir.health());

const results = await sir.search({
  query: "alice rabbit hole",
  mode: "blend",
  k: 10,
});
```

Mini UI:

```ts
import { mountMiniSirApp } from "@s-m-quadri/ltr-bert-sir-client/ui";
import "@s-m-quadri/ltr-bert-sir-client/theme.css";

mountMiniSirApp(document.getElementById("app")!);
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
ltr-bert-sir-client-js/
├── .github/workflows/ci.yml
├── src/
│   ├── client.ts
│   ├── types.ts
│   ├── format.ts
│   ├── hints.ts
│   ├── collections.ts
│   └── ui/
├── examples/basic-ui/
├── test/client.test.ts
├── package.json
└── LICENSE
```

## Publish

```bash
bunx npm login
bun publish --access public
```

License: Apache-2.0

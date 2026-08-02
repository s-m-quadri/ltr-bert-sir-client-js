# @s-m-quadri/ltr-bert-sir-client

TypeScript and JavaScript client for the **ELSIE** semantic information retrieval API. The API is served by the [sir-elsie](https://huggingface.co/spaces/s-m-quadri/sir-elsie) Hugging Face Space and implements the hybrid retrieval stack associated with the [ltr-bert-sir](https://huggingface.co/s-m-quadri/ltr-bert-sir) bi-encoder checkpoint: BM25 first stage, pool-restricted LTR-BERT scoring, optional cross-encoder reranking, and library management for long-text corpora.

**Authors:** Syed Minnatullah Quadri, Vrishali A. Chakkarwar  
**License:** Apache-2.0

## Related resources

| Resource | Description | URL |
|----------|-------------|-----|
| Model | Weights, metrics, offline `LTRBertSIR` | [huggingface.co/s-m-quadri/ltr-bert-sir](https://huggingface.co/s-m-quadri/ltr-bert-sir) |
| Demo Space (ELSIE) | Interactive UI and REST API | [huggingface.co/spaces/s-m-quadri/sir-elsie](https://huggingface.co/spaces/s-m-quadri/sir-elsie) |
| JavaScript client (npm) | This package | [npmjs.com/package/@s-m-quadri/ltr-bert-sir-client](https://www.npmjs.com/package/@s-m-quadri/ltr-bert-sir-client) |
| Python client (PyPI) | Companion package | [pypi.org/project/ltr-bert-sir-client](https://pypi.org/project/ltr-bert-sir-client/) |
| Source (TypeScript) | This repository | [github.com/s-m-quadri/ltr-bert-sir-client-js](https://github.com/s-m-quadri/ltr-bert-sir-client-js) |
| Source (Python) | Companion repository | [github.com/s-m-quadri/ltr-bert-sir-client-py](https://github.com/s-m-quadri/ltr-bert-sir-client-py) |
| Docker image | Self-hosted ELSIE API | [hub.docker.com/r/smquadri/ltr-bert-sir-elsie](https://hub.docker.com/r/smquadri/ltr-bert-sir-elsie) |

## Background

Long-document ad hoc retrieval on MS MARCO is typically staged: a lexical first stage (here BM25@100) defines a candidate pool; a bi-encoder scores only within that pool; scores are fused (linear blend with alpha = 0.85 by default) or passed to a cross-encoder on a short shortlist. The Hub model repository documents the fine-tuned LTR-BERT bi-encoder and offline scoring. This package targets the **live HTTP API** exposed by the ELSIE Space: search, collection ingest, seed libraries, qrels upload, batch evaluation, and library export.

Default base URL (`DEFAULT_SIR_API_URL`):

`https://huggingface.co/spaces/s-m-quadri/sir-elsie`

Point `baseUrl` to another deployment when you run the FastAPI app locally, via Docker, or on private infrastructure.

## Installation

```bash
npm install @s-m-quadri/ltr-bert-sir-client
```

```bash
bun add @s-m-quadri/ltr-bert-sir-client
pnpm add @s-m-quadri/ltr-bert-sir-client
```

**Requirements:** Node.js 18+ or a Bun runtime that provides `fetch`. The package ships ESM and CJS builds with TypeScript declarations.

## Configuration

```ts
import { createSirClient, DEFAULT_SIR_API_URL } from "@s-m-quadri/ltr-bert-sir-client";

const sir = createSirClient({
  baseUrl: DEFAULT_SIR_API_URL,
  timeoutMs: 120000,
});
```

| Option | Role |
|--------|------|
| `baseUrl` | Origin of the ELSIE API (no trailing slash required) |
| `timeoutMs` | Abort long encode or evaluate requests |
| `fetch` | Custom fetch implementation (tests, proxies) |

## Search modes

UI labels in ELSIE map to API `mode` values as follows.

| API `mode` | UI label | First stage | Neural stage | Notes |
|------------|----------|-------------|--------------|-------|
| `bm25` | Fast | BM25 | none | No embedding index required |
| `blend` | Hybrid | BM25@`bm25_k` | LTR-BERT fusion | Default; needs encoded collection |
| `semantic` | Dense | semantic pool | LTR-BERT | Semantic-first variant |
| `ce_cascade` | Precise | Hybrid pool | LTR-BERT + MiniLM CE | Reranks top `ce_top_k` |
| `ce_only` | CE-only | CE on pool | MiniLM CE | Cross-encoder without blend shortcut |

Common request fields on `search()`:

| Field | Meaning |
|-------|---------|
| `query` | Natural-language query string |
| `collection_id` | Target library (optional if server has active collection) |
| `mode` | One of the modes above |
| `k` | Number of hits to return |
| `bm25_k` | BM25 pool size when applicable |
| `ce_top_k` | Cross-encoder shortlist size |
| `alpha` | BM25 weight in linear blend (server default often 0.85) |

Responses include ranked `hits` (title, snippet, score, optional bm25/semantic/ce fields), timing `ms`, optional `trace` (pool, stages), and optional per-query `eval` when qrels exist.

## API overview

The `SirClient` class mirrors the Space REST surface.

| Area | Methods |
|------|---------|
| Health and defaults | `health()`, `rankingConfig()` |
| Collections | `listCollections()`, `getCollection()`, `createCollection()`, `importCollection()`, `deleteCollection()`, `cancelCollection()` |
| Ingest and index | `ingestFile()`, `ingestUrl()`, `encode()`, `progress()` |
| Search and documents | `search()`, `getDocument()` |
| Statistics | `stats()`, `clearStats()`, `statsExportUrl()` |
| Seeds | `listSeeds()`, `getSeed()`, `loadSeed()`, `indexSeed()`, `seedAlice()` |
| Qrels and evaluation | `qrelsStatus()`, `uploadQrels()`, `deleteQrels()`, `exportQrels()`, `annotateQrels()`, `evaluate()` |
| Library | `libraryConfig()`, `setLibraryConfig()`, `indexAll()`, `libraryStatus()`, `importLibrary()`, `exportLibrary()`, `exportLibraryWithConfig()`, `libraryExportUrl()` |
| Binary export | `exportUrl()`, `exportCollection()`, `download()` |

Helpers exported from the main entry:

| Module | Exports |
|--------|---------|
| `format` | `bytes`, `modeLabel`, `progressLabel`, `progressDetail`, `statusTone`, `shortName` |
| `hints` | UI tooltip strings aligned with ELSIE |
| `collections` | `dedupeCollections`, `duplicateCollections`, `collectionsBySeed` |

## Usage

```ts
import { createSirClient } from "@s-m-quadri/ltr-bert-sir-client";

const sir = createSirClient();

const health = await sir.health();
const { collections } = await sir.listCollections();

const response = await sir.search({
  query: "alice rabbit hole curious dream",
  collection_id: collections[0]?.id,
  mode: "blend",
  k: 10,
});

for (const hit of response.hits) {
  console.log(hit.title, hit.score);
}
```

Evaluate with uploaded qrels:

```ts
const metrics = await sir.evaluate(collectionId, {
  mode: "blend",
  k: 100,
  bm25_k: 100,
  ce_top_k: 32,
});
```

## Optional embedded UI

For demonstrations without a full application shell:

```ts
import { mountMiniSirApp } from "@s-m-quadri/ltr-bert-sir-client/ui";
import "@s-m-quadri/ltr-bert-sir-client/theme.css";

mountMiniSirApp(document.getElementById("app")!, {
  baseUrl: "https://huggingface.co/spaces/s-m-quadri/sir-elsie",
});
```

`mountMiniSirApp` wires collection selection, mode, top-k, and result listing against the same API.

## Citation

Bibliographies and publication details are on the [ltr-bert-sir model card](https://huggingface.co/s-m-quadri/ltr-bert-sir#citation) on Hugging Face. Cite MS MARCO when using bundled evaluation qrels or MS MARCO-derived training described there.

## License

Apache-2.0. MS MARCO remains under Microsoft research terms when used through the API or bundled seeds.

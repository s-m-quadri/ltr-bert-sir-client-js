import type {
  Collection,
  CollectionStats,
  Document,
  EvaluateResult,
  HealthResponse,
  ImportLibraryResult,
  LibraryConfig,
  LibraryRuntime,
  LibraryStatus,
  QrelsAnnotateRequest,
  QrelsAnnotateResponse,
  QrelsExport,
  QrelsStatus,
  RankingConfig,
  SearchRequest,
  SearchResponse,
  SeedDetail,
  SeedSummary,
  SirClientOptions,
} from "./types";
import { DEFAULT_SIR_API_URL } from "./types";

type FetchLike = typeof fetch;

async function parseError(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const data = (await res.json()) as {
      detail?: string | { msg?: string }[];
    };
    const d = data.detail;
    if (Array.isArray(d)) return d.map((x) => x.msg || String(x)).join("; ");
    if (d) return String(d);
  }
  return res.statusText || `HTTP ${res.status}`;
}

function enc(path: string): string {
  return encodeURIComponent(path);
}

export class SirClient {
  readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs?: number;

  constructor(options: SirClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_SIR_API_URL).replace(/\/$/, "");
    const nativeFetch = globalThis.fetch;
    if (!nativeFetch && !options.fetch) {
      throw new Error("fetch is not available; pass fetch in SirClientOptions");
    }
    this.fetchFn =
      options.fetch ??
      ((input: RequestInfo | URL, init?: RequestInit) =>
        nativeFetch.call(globalThis, input, init));
    this.timeoutMs = options.timeoutMs;
  }

  url(path: string): string {
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  collectionUrl(collectionId: string, suffix = ""): string {
    return this.url(`/collections/${enc(collectionId)}${suffix}`);
  }

  exportUrl(collectionId: string): string {
    return this.collectionUrl(collectionId, "/export");
  }

  statsExportUrl(collectionId: string, detail: "important" | "all" = "all"): string {
    return this.collectionUrl(collectionId, `/stats/export?detail=${detail}`);
  }

  qrelsExportUrl(collectionId: string): string {
    return this.collectionUrl(collectionId, "/qrels/export");
  }

  libraryExportUrl(activeCollectionId?: string | null): string {
    const q = activeCollectionId
      ? `?active_collection_id=${enc(activeCollectionId)}`
      : "";
    return this.url(`/library/export${q}`);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = this.timeoutMs ? new AbortController() : undefined;
    const timer =
      controller && setTimeout(() => controller.abort(), this.timeoutMs as number);
    try {
      const res = await this.fetchFn(this.url(path), {
        ...init,
        signal: controller?.signal,
      });
      if (!res.ok) throw new Error(await parseError(res));
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return (await res.json()) as T;
      return undefined as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async download(path: string): Promise<Blob> {
    const controller = this.timeoutMs ? new AbortController() : undefined;
    const timer =
      controller && setTimeout(() => controller.abort(), this.timeoutMs as number);
    try {
      const res = await this.fetchFn(this.url(path), { signal: controller?.signal });
      if (!res.ok) throw new Error(await parseError(res));
      return await res.blob();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  health(): Promise<HealthResponse> {
    return this.request("/health");
  }

  rankingConfig(): Promise<RankingConfig> {
    return this.request("/config/ranking");
  }

  listCollections(): Promise<{ collections: Collection[] }> {
    return this.request("/collections");
  }

  getCollection(collectionId: string): Promise<Collection> {
    return this.request(`/collections/${enc(collectionId)}`);
  }

  createCollection(name: string): Promise<Collection> {
    return this.request("/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  importCollection(file: Blob, name?: string, filename = "import.sirpack"): Promise<{ collection: Collection }> {
    const fd = new FormData();
    fd.append("file", file, filename);
    if (name) fd.append("name", name);
    return this.request("/collections/import", { method: "POST", body: fd });
  }

  search(body: SearchRequest): Promise<SearchResponse> {
    return this.request("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  getDocument(collectionId: string, docId: string): Promise<Document> {
    return this.request(`/collections/${enc(collectionId)}/docs/${enc(docId)}`);
  }

  encode(collectionId: string): Promise<{ collection: Collection }> {
    return this.request(`/collections/${enc(collectionId)}/encode`, { method: "POST" });
  }

  progress(collectionId: string): Promise<{
    id: string;
    status?: string;
    progress?: Collection["progress"];
    progress_label?: string;
    progress_detail?: string;
    encode_error?: string | null;
    chunks?: number;
  }> {
    return this.request(`/collections/${enc(collectionId)}/progress`);
  }

  stats(collectionId: string, detail: "important" | "all" = "important"): Promise<CollectionStats> {
    return this.request(`/collections/${enc(collectionId)}/stats?detail=${detail}`);
  }

  clearStats(collectionId: string, scope: "history" = "history"): Promise<{ cleared: string }> {
    return this.request(`/collections/${enc(collectionId)}/stats/clear?scope=${scope}`, {
      method: "POST",
    });
  }

  listSeeds(): Promise<{ seeds: SeedSummary[] }> {
    return this.request("/seeds");
  }

  getSeed(seedId: string): Promise<SeedDetail> {
    return this.request(`/seeds/${enc(seedId)}`);
  }

  loadSeed(
    seedId: string,
    options: { encode?: boolean; force?: boolean; background?: boolean } = {}
  ): Promise<{ collection: Collection; detail?: SeedDetail }> {
    const q = new URLSearchParams();
    if (options.encode) q.set("encode", "true");
    if (options.force) q.set("force", "true");
    if (options.background === false) q.set("background", "false");
    const suffix = q.toString() ? `?${q}` : "";
    return this.request(`/seeds/${enc(seedId)}${suffix}`, { method: "POST" });
  }

  indexSeed(seedId: string): Promise<{ collection: Collection; detail?: SeedDetail }> {
    return this.request(`/seeds/${enc(seedId)}/index`, { method: "POST" });
  }

  seedAlice(encode = true): Promise<{ collection: Collection }> {
    return this.request(`/seed/alice?encode=${encode ? "true" : "false"}`, { method: "POST" });
  }

  ingestFile(collectionId: string, file: Blob, filename = "upload.bin"): Promise<unknown> {
    const fd = new FormData();
    fd.append("file", file, filename);
    return this.request(`/collections/${enc(collectionId)}/ingest`, { method: "POST", body: fd });
  }

  ingestUrl(collectionId: string, url: string): Promise<unknown> {
    return this.request(`/collections/${enc(collectionId)}/ingest_url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  }

  cancelCollection(collectionId: string): Promise<{ collection: Collection }> {
    return this.request(`/collections/${enc(collectionId)}/cancel`, { method: "POST" });
  }

  deleteCollection(collectionId: string): Promise<{ deleted: string }> {
    return this.request(`/collections/${enc(collectionId)}`, { method: "DELETE" });
  }

  qrelsStatus(collectionId: string): Promise<QrelsStatus> {
    return this.request(`/collections/${enc(collectionId)}/qrels`);
  }

  uploadQrels(
    collectionId: string,
    queries_tsv: string,
    qrels_tsv: string
  ): Promise<{ ok: boolean; queries: number; judgments: number }> {
    return this.request(`/collections/${enc(collectionId)}/qrels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries_tsv, qrels_tsv }),
    });
  }

  deleteQrels(collectionId: string): Promise<{ deleted: boolean }> {
    return this.request(`/collections/${enc(collectionId)}/qrels`, { method: "DELETE" });
  }

  exportQrels(collectionId: string): Promise<QrelsExport> {
    return this.request(`/collections/${enc(collectionId)}/qrels/export`);
  }

  annotateQrels(collectionId: string, body: QrelsAnnotateRequest): Promise<QrelsAnnotateResponse> {
    return this.request(`/collections/${enc(collectionId)}/qrels/annotate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  evaluate(collectionId: string, body: {
    mode?: string;
    k?: number;
    bm25_k?: number;
    ce_top_k?: number;
    limit?: number;
  }): Promise<EvaluateResult> {
    return this.request(`/collections/${enc(collectionId)}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  libraryConfig(): Promise<LibraryConfig> {
    return this.request("/library/config");
  }

  setLibraryConfig(runtime: LibraryRuntime): Promise<LibraryConfig> {
    return this.request("/library/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(runtime),
    });
  }

  indexAll(background = true, wait = false): Promise<Record<string, unknown>> {
    return this.request(
      `/library/index-all?background=${background ? "true" : "false"}&wait=${wait ? "true" : "false"}`,
      { method: "POST" }
    );
  }

  libraryStatus(): Promise<LibraryStatus> {
    return this.request("/library/status");
  }

  importLibrary(
    file: Blob,
    options: {
      filename?: string;
      replace?: boolean;
      merge_seeds?: boolean;
      prefer_zip?: boolean;
    } = {}
  ): Promise<ImportLibraryResult> {
    const fd = new FormData();
    fd.append("file", file, options.filename ?? "library.sirlibrary");
    fd.append("replace", options.replace ? "true" : "false");
    fd.append("merge_seeds", options.merge_seeds !== false ? "true" : "false");
    fd.append("prefer_zip", options.prefer_zip ? "true" : "false");
    return this.request("/library/import", { method: "POST", body: fd });
  }

  exportLibrary(activeCollectionId?: string | null): Promise<Blob> {
    const q = activeCollectionId
      ? `?active_collection_id=${enc(activeCollectionId)}`
      : "";
    return this.download(`/library/export${q}`);
  }

  exportLibraryWithConfig(runtime: LibraryRuntime): Promise<Blob> {
    const controller = this.timeoutMs ? new AbortController() : undefined;
    const timer =
      controller && setTimeout(() => controller.abort(), this.timeoutMs as number);
    try {
      return this.fetchFn(this.url("/library/export"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runtime),
        signal: controller?.signal,
      }).then(async (res) => {
        if (!res.ok) throw new Error(await parseError(res));
        return res.blob();
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  exportCollection(collectionId: string): Promise<Blob> {
    return this.download(`/collections/${enc(collectionId)}/export`);
  }
}

export function createSirClient(options?: SirClientOptions): SirClient {
  return new SirClient(options);
}

export function createSirApi(options?: SirClientOptions): SirClient {
  return createSirClient(options);
}

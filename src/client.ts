import type {
  Collection,
  CollectionStats,
  Document,
  HealthResponse,
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

export class SirClient {
  readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs?: number;

  constructor(options: SirClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_SIR_API_URL).replace(/\/$/, "");
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs;
    if (!this.fetchFn) {
      throw new Error("fetch is not available; pass fetch in SirClientOptions");
    }
  }

  url(path: string): string {
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  exportUrl(collectionId: string): string {
    return this.url(`/collections/${encodeURIComponent(collectionId)}/export`);
  }

  statsExportUrl(collectionId: string, detail: "important" | "all" = "all"): string {
    return this.url(
      `/collections/${encodeURIComponent(collectionId)}/stats/export?detail=${detail}`
    );
  }

  libraryExportUrl(activeCollectionId?: string | null): string {
    const q = activeCollectionId
      ? `?active_collection_id=${encodeURIComponent(activeCollectionId)}`
      : "";
    return this.url(`/library/export${q}`);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = this.timeoutMs ? new AbortController() : undefined;
    const timer =
      controller &&
      setTimeout(() => controller.abort(), this.timeoutMs as number);
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

  health(): Promise<HealthResponse> {
    return this.request("/health");
  }

  rankingConfig(): Promise<RankingConfig> {
    return this.request("/config/ranking");
  }

  listCollections(): Promise<{ collections: Collection[] }> {
    return this.request("/collections");
  }

  createCollection(name: string): Promise<Collection> {
    return this.request("/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  search(body: SearchRequest): Promise<SearchResponse> {
    return this.request("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  getDocument(collectionId: string, docId: string): Promise<Document> {
    return this.request(
      `/collections/${encodeURIComponent(collectionId)}/docs/${encodeURIComponent(docId)}`
    );
  }

  encode(collectionId: string): Promise<{ collection: Collection }> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}/encode`, {
      method: "POST",
    });
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
    return this.request(`/collections/${encodeURIComponent(collectionId)}/progress`);
  }

  stats(collectionId: string, detail: "important" | "all" = "important"): Promise<CollectionStats> {
    return this.request(
      `/collections/${encodeURIComponent(collectionId)}/stats?detail=${detail}`
    );
  }

  listSeeds(): Promise<{ seeds: SeedSummary[] }> {
    return this.request("/seeds");
  }

  getSeed(seedId: string): Promise<SeedDetail> {
    return this.request(`/seeds/${encodeURIComponent(seedId)}`);
  }

  loadSeed(seedId: string, force = false): Promise<{ collection: Collection; detail?: SeedDetail }> {
    return this.request(`/seeds/${encodeURIComponent(seedId)}?force=${force}`, {
      method: "POST",
    });
  }

  indexSeed(seedId: string): Promise<{ collection: Collection; detail?: SeedDetail }> {
    return this.request(`/seeds/${encodeURIComponent(seedId)}/index`, { method: "POST" });
  }

  ingestFile(collectionId: string, file: Blob, filename = "upload.bin"): Promise<unknown> {
    const fd = new FormData();
    fd.append("file", file, filename);
    return this.request(`/collections/${encodeURIComponent(collectionId)}/ingest`, {
      method: "POST",
      body: fd,
    });
  }

  ingestUrl(collectionId: string, url: string): Promise<unknown> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}/ingest_url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  }

  cancelCollection(collectionId: string): Promise<{ collection: Collection }> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}/cancel`, {
      method: "POST",
    });
  }

  deleteCollection(collectionId: string): Promise<{ deleted: string }> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}`, { method: "DELETE" });
  }

  qrelsStatus(collectionId: string): Promise<QrelsStatus> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}/qrels`);
  }

  uploadQrels(
    collectionId: string,
    queries_tsv: string,
    qrels_tsv: string
  ): Promise<{ ok: boolean; queries: number; judgments: number }> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}/qrels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries_tsv, qrels_tsv }),
    });
  }

  evaluate(
    collectionId: string,
    body: {
      mode?: string;
      k?: number;
      bm25_k?: number;
      ce_top_k?: number;
      limit?: number;
    }
  ): Promise<{ macro?: Record<string, number>; n_queries?: number; mode?: string }> {
    return this.request(`/collections/${encodeURIComponent(collectionId)}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  importLibrary(
    file: Blob,
    filename = "library.sirlibrary",
    preferZip = true
  ): Promise<{
    imported: number;
    ready?: number;
    collections?: Collection[];
    active_collection_id?: string;
  }> {
    const fd = new FormData();
    fd.append("file", file, filename);
    fd.append("replace", "false");
    fd.append("merge_seeds", "true");
    fd.append("prefer_zip", preferZip ? "true" : "false");
    return this.request("/library/import", { method: "POST", body: fd });
  }

  libraryStatus(): Promise<{
    collections: number;
    ready: number;
    encoding: number;
    index_all_running?: boolean;
  }> {
    return this.request("/library/status");
  }
}

export function createSirClient(options?: SirClientOptions): SirClient {
  return new SirClient(options);
}

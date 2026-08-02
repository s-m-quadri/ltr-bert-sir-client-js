export type SearchMode = "bm25" | "blend" | "ce_cascade" | "semantic" | "ce_only";

export interface SearchRequest {
  query: string;
  collection_id?: string | null;
  mode?: SearchMode;
  k?: number;
  bm25_k?: number | null;
  ce_top_k?: number | null;
  alpha?: number | null;
}

export interface EvalMetrics {
  "nDCG@10"?: number;
  "nDCG@100"?: number;
  "RR@10"?: number;
  "AP@100"?: number;
  "P@10"?: number;
  "P@100"?: number;
  "RR@100"?: number;
  "AP@10"?: number;
}

export interface SearchEval {
  qid?: string;
  query?: string;
  metrics?: EvalMetrics;
}

export interface Hit {
  doc_id: string;
  title: string;
  snippet: string;
  score: number;
  bm25?: number | null;
  semantic?: number | null;
  ce?: number | null;
  rank_bm25?: number | null;
  rank_semantic?: number | null;
  rank_fused?: number | null;
  rank_final?: number | null;
  mode: string;
}

export interface PoolEntry {
  doc_id: string;
  title?: string;
  bm25?: number;
  semantic?: number;
  fused?: number;
  bm25_norm?: number;
  semantic_norm?: number;
  ce_score?: number;
  rank_bm25?: number;
  rank_semantic?: number;
  rank_fused?: number;
  rank_final?: number;
}

export interface SearchTrace {
  config?: Record<string, unknown>;
  timing_ms?: Record<string, number>;
  stages?: string[];
  pool?: PoolEntry[];
  provenance?: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  mode: string;
  collection_id: string;
  collection_name?: string;
  hits: Hit[];
  trace?: SearchTrace;
  ms?: number;
  eval?: SearchEval | null;
}

export interface CollectionProgress {
  pct?: number;
  message?: string;
  phase?: string;
  step?: string;
  task?: string;
  done?: number;
  total?: number;
  label?: string;
  detail?: string;
}

export interface Collection {
  id: string;
  name: string;
  created?: number;
  files?: number;
  chunks?: number;
  status?: string;
  encode_error?: string | null;
  progress?: CollectionProgress;
  progress_label?: string;
  progress_detail?: string;
  seed?: string;
  seed_category?: string;
  seed_blurb?: string;
  chunk_scheme?: string;
  chunk_mode?: string;
  source_url?: string;
  has_embeddings?: boolean;
}

export interface HealthResponse {
  ok: boolean;
  model: boolean;
  collections: number;
}

export interface RankingConfig {
  alpha?: number;
  bm25_k?: number;
  ce_top_k?: number;
  k_default?: number;
  mode_default?: string;
  model_default?: string;
  bert_model?: string;
  ce_model?: string;
  compress_dim?: number;
  max_query_len?: number;
  seg_len?: number;
  max_doc_len?: number;
  rrf_k?: number;
  modes?: string[];
  active_collection_id?: string;
  runtime?: Record<string, unknown>;
}

export interface SeedSummary {
  id: string;
  name: string;
  category: string;
  blurb?: string;
  author?: string;
  why?: string;
  source_url?: string;
  source_page?: string;
  license?: string;
  chunk_mode?: string;
  preprocessing?: string[];
  indexing?: string[];
  sample_queries?: Array<{ text?: string; query?: string; mode?: string; k?: number }>;
}

export interface SeedDetail extends SeedSummary {
  loaded?: boolean;
  scheme_current?: boolean;
  preprocessing?: string[];
  indexing?: string[];
  collection?: Collection & {
    pack_bytes?: number;
    db_bytes?: number;
    emb_bytes?: number;
    encode_seconds?: number;
  };
}

export interface Document {
  id: string;
  title: string;
  text: string;
  collection_id: string;
}

export interface CollectionStats {
  name?: string;
  chunks?: number;
  chars_total?: number;
  chars_mean?: number;
  chars_min?: number;
  chars_max?: number;
  seed?: string;
  db_bytes?: number;
  emb_bytes?: number;
  pack_bytes?: number;
  meta_bytes?: number;
  status?: string;
  has_embeddings?: boolean;
  encode_seconds?: number;
  encode_error?: string | null;
  search_history?: Array<{
    query?: string;
    mode?: string;
    hits?: number;
    ms?: number;
    t?: number;
    k?: number;
  }>;
  detail?: string;
  device?: string;
  gpu?: string;
  python?: string;
  platform?: string;
  bert_model?: string;
  ce_model?: string;
  checkpoint_exists?: boolean;
  checkpoint_path?: string;
  checkpoint_bytes?: number;
  alpha_default?: number;
  bm25_k?: number;
  ce_top_k?: number;
  generated_at?: number;
  searches?: number;
  last_search_at?: number;
  titles_sample?: string[];
}

export interface QrelsStatus {
  has_qrels: boolean;
  queries: number;
  judgments: number;
}

export interface QrelsExport {
  queries_tsv: string;
  qrels_tsv: string;
  queries: number;
  judgments: number;
}

export interface QrelsAnnotateRequest {
  query: string;
  judgments?: Record<string, number>;
  ranked_doc_ids?: string[];
  qid?: string;
}

export interface QrelsAnnotateResponse {
  ok: boolean;
  qid?: string;
  queries: number;
  judgments: number;
  saved_for_query: number;
}

export interface LibraryRuntime {
  mode?: SearchMode;
  k?: number;
  bm25_k?: number;
  alpha?: number;
  ce_top_k?: number;
  model?: string;
  active_collection_id?: string;
}

export interface LibraryConfig {
  runtime?: LibraryRuntime;
  pipeline?: Record<string, unknown>;
  index_all_running?: boolean;
  active_collection_id?: string;
}

export interface LibraryBusyItem {
  id: string;
  name?: string;
  status?: string;
  progress?: CollectionProgress;
  progress_label?: string;
  progress_detail?: string;
  chunks?: number;
}

export interface IndexAllProgress {
  running?: boolean;
  done?: number;
  total?: number;
  pct?: number;
  message?: string;
  label?: string;
  detail?: string;
  current_name?: string;
}

export interface LibraryStatus {
  collections: number;
  ready: number;
  encoding: number;
  ingesting?: number;
  busy?: LibraryBusyItem[];
  index_all?: IndexAllProgress;
  index_all_running?: boolean;
}

export interface ImportLibraryResult {
  imported: number;
  ready?: number;
  collections?: Collection[];
  active_collection_id?: string;
  skipped?: Array<{ reason?: string; seed?: string; name?: string }>;
  not_ready?: unknown[];
  manifest?: { source_collections?: number };
}

export interface EvaluateResult {
  macro?: Record<string, number>;
  n_queries?: number;
  mode?: string;
}

export interface SirClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export const DEFAULT_SIR_API_URL =
  "https://s-m-quadri-sir-elsie.hf.space";

export const DEFAULT_SIR_HUB_URL =
  "https://huggingface.co/spaces/s-m-quadri/sir-elsie";

export const SEARCH_MODES: SearchMode[] = [
  "bm25",
  "blend",
  "semantic",
  "ce_cascade",
  "ce_only",
];

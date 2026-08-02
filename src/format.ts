import type { Collection } from "./types";

export function bytes(n: number): string {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

export function shortName(name: string | undefined, max = 18): string {
  if (!name) return "Library";
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export const MODE_LABELS: Record<string, string> = {
  bm25: "Fast",
  blend: "Hybrid",
  semantic: "Dense",
  ce_cascade: "Precise",
  ce_only: "CE-only",
};

export function modeLabel(mode?: string): string {
  if (!mode) return "Hybrid";
  return MODE_LABELS[mode] ?? mode;
}

export function statusTone(
  status?: string,
  error?: string | null
): "ready" | "busy" | "error" | "idle" {
  if (error) return "error";
  if (status === "ready") return "ready";
  if (status === "encoding" || status === "ingesting") return "busy";
  return "idle";
}

export function progressLabel(collection: Collection | null | undefined): string {
  if (!collection) return "Starting…";
  if (collection.progress_label) return collection.progress_label;
  const prog = collection.progress || {};
  if (prog.label) return prog.label;
  const msg = prog.message?.trim();
  const generic = new Set([
    "",
    "Working…",
    "Working",
    "Indexing",
    "Loading seed…",
    "Queued seed load…",
    "Encoding chunks…",
  ]);
  if (msg && !generic.has(msg)) return msg;

  const phaseMap: Record<string, string> = {
    queued: "Queued",
    fetch: "Fetching source",
    parse: "Parsing text",
    chunk: "Chunking passages",
    extract: "Extracting text",
    ingest: "Writing FTS index",
    loading_model: "Loading LTR-BERT",
    encoding: "Encoding passages",
    saving: "Saving embeddings",
    ready: "Ready",
    import: "Importing library",
    idle: "Idle",
  };
  const taskMap: Record<string, string> = {
    load_seed: "Load seed",
    encode: "LTR encode",
    ingest_file: "File ingest",
    ingest_url: "URL ingest",
    index_all: "Index all seeds",
  };
  const who = collection.name || "Collection";
  const task = taskMap[prog.task || ""] || "";
  let body =
    prog.step || phaseMap[prog.phase || ""] || prog.phase || collection.status || "Working";
  if (prog.total) body = `${body} ${prog.done || 0}/${prog.total}`;
  if (task) return `${task} · ${who}: ${body}`;
  return `${who}: ${body}`;
}

export function progressDetail(collection: Collection | null | undefined): string | null {
  if (!collection) return null;
  if (collection.progress_detail) return collection.progress_detail;
  const prog = collection.progress;
  if (prog?.detail) return prog.detail;
  const parts: string[] = [];
  const taskMap: Record<string, string> = {
    load_seed: "Load seed",
    encode: "LTR encode",
    ingest_file: "File ingest",
    ingest_url: "URL ingest",
    index_all: "Index all seeds",
  };
  if (prog?.task && taskMap[prog.task]) parts.push(taskMap[prog.task]);
  if (prog?.phase) parts.push(prog.phase.replace(/_/g, " "));
  return parts.length ? parts.join(" · ") : null;
}

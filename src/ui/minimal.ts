import { SirClient, createSirClient } from "../client";
import { modeLabel } from "../format";
import type { Collection, Hit, SearchMode, SearchResponse } from "../types";
import { DEFAULT_SIR_API_URL } from "../types";

export type MiniSirAppOptions = {
  baseUrl?: string;
  client?: SirClient;
  collectionId?: string;
  mode?: SearchMode;
  k?: number;
  onSearch?: (response: SearchResponse) => void;
  onError?: (error: Error) => void;
};

export type MiniSirApp = {
  client: SirClient;
  refreshCollections: () => Promise<void>;
  search: (query?: string) => Promise<SearchResponse | null>;
  destroy: () => void;
};

export function mountMiniSirApp(
  root: HTMLElement,
  options: MiniSirAppOptions = {}
): MiniSirApp {
  const client = options.client ?? createSirClient({ baseUrl: options.baseUrl });
  let collections: Collection[] = [];
  let activeId = options.collectionId ?? "";
  let mode = options.mode ?? "blend";
  let k = options.k ?? 10;
  let lastResponse: SearchResponse | null = null;

  root.classList.add("sir-mini");
  root.innerHTML = `
    <h1>ELSIE · SIR mini</h1>
    <div class="sir-meta" data-role="status">Connecting…</div>
    <div class="sir-row">
      <select data-role="collection" aria-label="Collection"></select>
      <select data-role="mode" aria-label="Mode">
        <option value="bm25">Fast (BM25)</option>
        <option value="blend">Hybrid</option>
        <option value="semantic">Dense</option>
        <option value="ce_cascade">Precise (CE)</option>
        <option value="ce_only">CE-only</option>
      </select>
      <select data-role="k" aria-label="Top k">
        <option value="5">k=5</option>
        <option value="10">k=10</option>
        <option value="20">k=20</option>
      </select>
      <button type="button" data-role="refresh">Refresh</button>
    </div>
    <textarea data-role="query" placeholder="Search query…"></textarea>
    <div class="sir-row">
      <button type="button" data-role="search">Search</button>
    </div>
    <div data-role="error" class="sir-error" hidden></div>
    <div data-role="results"></div>
  `;

  const statusEl = root.querySelector("[data-role=status]") as HTMLElement;
  const collectionEl = root.querySelector("[data-role=collection]") as HTMLSelectElement;
  const modeEl = root.querySelector("[data-role=mode]") as HTMLSelectElement;
  const kEl = root.querySelector("[data-role=k]") as HTMLSelectElement;
  const queryEl = root.querySelector("[data-role=query]") as HTMLTextAreaElement;
  const resultsEl = root.querySelector("[data-role=results]") as HTMLElement;
  const errorEl = root.querySelector("[data-role=error]") as HTMLElement;

  modeEl.value = mode;
  kEl.value = String(k);

  function showError(msg: string | null) {
    if (!msg) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  function renderHits(hits: Hit[]) {
    if (!hits.length) {
      resultsEl.innerHTML = "<p class=\"sir-meta\">No hits.</p>";
      return;
    }
    resultsEl.innerHTML = hits
      .map(
        (h, i) => `
      <article class="sir-hit">
        <div class="sir-row" style="justify-content:space-between;align-items:baseline">
          <h3>${i + 1}. ${escapeHtml(h.title || h.doc_id)}</h3>
          <span class="sir-score">${h.score.toFixed(4)}</span>
        </div>
        <p>${escapeHtml(h.snippet || "")}</p>
      </article>`
      )
      .join("");
  }

  async function refreshCollections() {
    showError(null);
    try {
      const health = await client.health();
      const data = await client.listCollections();
      collections = data.collections || [];
      collectionEl.innerHTML = collections
        .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`)
        .join("");
      if (!activeId && collections[0]) activeId = collections[0].id;
      if (activeId) collectionEl.value = activeId;
      statusEl.textContent = `${health.collections} collections · API ${client.baseUrl}`;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(err.message);
      options.onError?.(err);
      statusEl.textContent = `API ${client.baseUrl}`;
    }
  }

  async function search(query?: string): Promise<SearchResponse | null> {
    showError(null);
    const q = (query ?? queryEl.value).trim();
    if (!q) {
      showError("Enter a query.");
      return null;
    }
    activeId = collectionEl.value || activeId;
    mode = modeEl.value as SearchMode;
    k = Number(kEl.value) || 10;
    if (!activeId) {
      showError("Select a collection.");
      return null;
    }
    try {
      const res = await client.search({
        query: q,
        collection_id: activeId,
        mode,
        k,
      });
      lastResponse = res;
      statusEl.textContent = `${res.hits.length} hits · ${modeLabel(res.mode)} · ${res.ms ?? "?"} ms`;
      renderHits(res.hits);
      options.onSearch?.(res);
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      showError(err.message);
      options.onError?.(err);
      return null;
    }
  }

  root.querySelector("[data-role=search]")?.addEventListener("click", () => search());
  root.querySelector("[data-role=refresh]")?.addEventListener("click", () => refreshCollections());
  collectionEl.addEventListener("change", () => {
    activeId = collectionEl.value;
  });

  refreshCollections();

  return {
    client,
    refreshCollections,
    search,
    destroy: () => {
      root.innerHTML = "";
      root.classList.remove("sir-mini");
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { DEFAULT_SIR_API_URL };

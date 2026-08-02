import { describe, expect, it, vi } from "vitest";
import {
  SirClient,
  DEFAULT_SIR_API_URL,
  modeLabel,
  dedupeCollections,
  duplicateCollections,
} from "../src";

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => body,
      blob: async () => new Blob(),
    } as Response;
  });
}

describe("SirClient", () => {
  it("defaults to live Space URL", () => {
    const c = new SirClient({ fetch: mockFetch({ ok: true }) });
    expect(c.baseUrl).toBe(DEFAULT_SIR_API_URL);
  });

  it("covers library and qrels endpoints", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      const path = url.replace("http://test", "");
      if (path === "/library/config") {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ runtime: { mode: "blend" } }),
        } as Response;
      }
      if (path.startsWith("/collections/c1/qrels/annotate")) {
        expect(init?.method).toBe("POST");
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ ok: true, queries: 1, judgments: 2, saved_for_query: 2 }),
        } as Response;
      }
      if (path === "/library/index-all?background=true&wait=false") {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ started: true }),
        } as Response;
      }
      throw new Error(`unexpected ${path}`);
    }) as typeof fetch;

    const c = new SirClient({ baseUrl: "http://test", fetch });
    const cfg = await c.libraryConfig();
    expect(cfg.runtime?.mode).toBe("blend");
    const ann = await c.annotateQrels("c1", {
      query: "test",
      ranked_doc_ids: ["a", "b"],
    });
    expect(ann.saved_for_query).toBe(2);
    const idx = await c.indexAll(true, false);
    expect(idx.started).toBe(true);
  });

  it("builds export URLs", () => {
    const c = new SirClient({ baseUrl: "http://test", fetch: mockFetch({}) });
    expect(c.qrelsExportUrl("abc")).toBe("http://test/collections/abc/qrels/export");
    expect(modeLabel("blend")).toBe("Hybrid");
  });

  it("dedupes collections by seed", () => {
    const cols = dedupeCollections([
      { id: "a", name: "A", seed: "s1", status: "ready", chunks: 10 },
      { id: "b", name: "B", seed: "s1", status: "idle", chunks: 5 },
    ]);
    expect(cols.length).toBe(1);
    expect(cols[0].id).toBe("a");
    expect(duplicateCollections([
      { id: "a", name: "A", seed: "s1", status: "ready" },
      { id: "b", name: "B", seed: "s1", status: "idle" },
    ]).length).toBe(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import { SirClient, DEFAULT_SIR_API_URL } from "../src";

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => body,
    } as Response;
  });
}

describe("SirClient", () => {
  it("defaults to live Space URL", () => {
    const c = new SirClient({ fetch: mockFetch({ ok: true }) });
    expect(c.baseUrl).toBe(DEFAULT_SIR_API_URL);
  });

  it("health()", async () => {
    const fetch = mockFetch({ ok: true, model: true, collections: 2 });
    const c = new SirClient({ baseUrl: "http://test", fetch });
    const h = await c.health();
    expect(h.collections).toBe(2);
    expect(fetch).toHaveBeenCalledWith("http://test/health", expect.any(Object));
  });

  it("search() posts JSON body", async () => {
    const fetch = mockFetch({
      query: "q",
      mode: "blend",
      collection_id: "c1",
      hits: [],
    });
    const c = new SirClient({ baseUrl: "http://test", fetch });
    const res = await c.search({ query: "alice rabbit", mode: "blend", k: 5 });
    expect(res.query).toBe("q");
    const call = fetch.mock.calls[0];
    expect(call[0]).toBe("http://test/search");
    expect(JSON.parse((call[1] as RequestInit).body as string)).toMatchObject({
      query: "alice rabbit",
      mode: "blend",
      k: 5,
    });
  });

  it("surfaces API error detail", async () => {
    const fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ detail: "collection not found" }),
    })) as typeof fetch;
    const c = new SirClient({ baseUrl: "http://test", fetch });
    await expect(c.stats("missing")).rejects.toThrow("collection not found");
  });

  it("builds export URLs", () => {
    const c = new SirClient({ baseUrl: "http://test", fetch: mockFetch({}) });
    expect(c.exportUrl("abc")).toBe("http://test/collections/abc/export");
    expect(c.libraryExportUrl("x")).toBe(
      "http://test/library/export?active_collection_id=x"
    );
  });
});

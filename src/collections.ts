import type { Collection } from "./types";

function collectionScore(c: Collection): number {
  const rank = { ready: 3, encoding: 2, ingesting: 1 }[c.status || ""] || 0;
  const emb = c.has_embeddings || c.status === "ready" ? 1 : 0;
  return rank * 1e9 + emb * 1e6 + Number(c.chunks || 0);
}

export function dedupeCollections(collections: Collection[]): Collection[] {
  const bySeed = new Map<string, Collection>();
  const byName = new Map<string, Collection>();

  for (const c of collections) {
    if (c.seed) {
      const prev = bySeed.get(c.seed);
      if (!prev || collectionScore(c) > collectionScore(prev)) {
        bySeed.set(c.seed, c);
      }
      continue;
    }
    const key = (c.name || c.id).toLowerCase();
    const prev = byName.get(key);
    if (!prev || collectionScore(c) > collectionScore(prev)) {
      byName.set(key, c);
    }
  }

  return [...bySeed.values(), ...byName.values()].sort(
    (a, b) => (b.created || 0) - (a.created || 0)
  );
}

export function duplicateCollections(collections: Collection[]): Collection[] {
  const keep = new Set(dedupeCollections(collections).map((c) => c.id));
  return collections.filter((c) => !keep.has(c.id));
}

export function collectionsBySeed(collections: Collection[]): Map<string, Collection> {
  const map = new Map<string, Collection>();
  for (const c of collections) {
    if (!c.seed) continue;
    const prev = map.get(c.seed);
    if (!prev || collectionScore(c) > collectionScore(prev)) {
      map.set(c.seed, c);
    }
  }
  return map;
}

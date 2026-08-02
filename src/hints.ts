export const hints = {
  library:
    "The book or corpus you search. Pick a seed from the catalog or upload your own file.",
  query: "Enter a question or phrase to search the loaded library.",
  modeFast:
    "Fast uses keyword matching (BM25) only. Quick, no GPU index needed. Good for exact terms.",
  modeHybrid:
    "Hybrid blends keywords with LTR-BERT semantic scores. Best default for most questions.",
  modePrecise:
    "Precise adds a cross-encoder reranker on top of Hybrid. Slower, sharper top results.",
  model:
    "LTR-BERT is the learned reranker trained for long-text retrieval. Dense and CE-only modes coming later.",
  stats:
    "Corpus size, index health, and recent searches. Opens the statistics panel beside the main view.",
  search:
    "Run search with the current library, mode, and query. Needs a loaded collection.",
  index:
    "Builds embedding vectors for Hybrid and Precise modes. Fast mode works without this step.",
  export:
    "Download a .sirpack zip of this collection for backup or sharing.",
  browse:
    "Open the full library catalog with seed details, sources, and import options.",
  chunks:
    "Passages the book was split into. More chunks mean finer retrieval, slightly slower index.",
  status:
    "idle = loaded text only. ingesting/encoding = working. ready = hybrid search available.",
  score:
    "Final ranking score for this hit. Higher is more relevant to your query in the chosen mode.",
  bm25:
    "Lexical keyword score from BM25. High when your words appear in the passage.",
  semantic:
    "Neural similarity from LTR-BERT. High when meaning matches even without shared words.",
  snippet:
    "Best-matching excerpt. Double-click a result to read the full passage.",
  pipeline:
    "Step-by-step diagram of how this query moved through retrieval stages.",
  analytics:
    "Timing and score charts for the candidate pool behind these results.",
  seedWhy:
    "Why this title is in the catalog and what kinds of queries it exercises.",
  seedSource:
    "Original text source. Project Gutenberg and similar public-domain hosts.",
  seedPreprocess:
    "How raw text is cleaned before chunking.",
  seedIndex:
    "How passages are split and indexed for Fast vs Hybrid search.",
  seedLoad:
    "Download text and store passages. Fast search works immediately after load.",
  seedLoadIndex:
    "Load text then start GPU indexing for Hybrid and Precise modes.",
  cancelWork:
    "Stops a stuck load or index. The background task may finish on its own, but the UI will reset so you can try again.",
  upload:
    "Add a .txt, .md, or .pdf from your machine. Creates a collection if none exists.",
  ingestUrl:
    "Fetch a web page or plain-text URL and add it to your library.",
  corpusStats:
    "Size and shape of the loaded text in this collection.",
  indexStats:
    "Whether neural embeddings exist and how long indexing took.",
  searchHistory:
    "Your last few queries on this collection with mode and timing.",
  systemDetails:
    "Hardware, Python, and model paths. Useful for debugging reproduction.",
} as const;

export type HintKey = keyof typeof hints;

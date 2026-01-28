# Vectorless vs PageIndex - Comparison

## Executive Summary

This document compares **Vectorless** (TypeScript native implementation) with the original **[VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex)** (Python). Both libraries aim to extract hierarchical document structure using AI reasoning, enabling intelligent navigation without vector databases.

PageIndex achieved **98.7% accuracy** on the FinanceBench benchmark, demonstrating superior performance over vector-based RAG solutions.

---

## Philosophy Comparison

Both projects share the same core philosophy:

> **"Similarity ≠ Relevance"** — what we truly need in retrieval is **relevance**, and that requires **reasoning**.

| Principle | PageIndex | Vectorless |
|-----------|-----------|------------|
| No Vector DB | Yes | Yes |
| No Chunking | Yes | Yes |
| Human-like Retrieval | Yes | Yes |
| Tree-based Structure | Yes | Yes |
| Reasoning-based | Yes | Yes |

---

## Architecture Comparison

### Original PageIndex (Python)

```
pageindex/
├── page_index.py      # Main logic (~1200 lines, async functions)
├── page_index_md.py   # Markdown document handling
├── utils.py           # Utility functions (ChatGPT API, PDF parsing)
└── config.yaml        # Configuration defaults
```

**Architecture:** Procedural/functional with async support. Functions grouped in single files.

### Vectorless (TypeScript)

```
vectorless/
├── src/
│   ├── agents/           # Specialized AI agents (3 files)
│   ├── domain/           # Zod schemas
│   ├── infrastructure/   # Adapters (PDF parser, cache, SSE)
│   ├── ports/            # Interface definitions
│   └── use-cases/        # Use case orchestrators
└── test/
```

**Architecture:** Hexagonal (ports & adapters) with SOLID principles.

| Aspect | PageIndex | Vectorless |
|--------|-----------|------------|
| Modularity | Medium (grouped functions) | High (hexagonal) |
| Testability | Medium (async functions) | High (dependency injection) |
| Extensibility | Config-based | Interface-based |
| Type Safety | Python types | Full TypeScript + Zod |
| Async Support | asyncio | Native async/await |

---

## Feature Comparison

### Core Features

| Feature | PageIndex | Vectorless | Status |
|---------|-----------|------------|--------|
| TOC Detection | Yes (multi-page scan) | Yes (multi-page scan) | **Maintained** |
| TOC Extraction | Yes (JSON format) | Yes (TreeNode format) | **Maintained** |
| Page Index Detection | Yes (physical_index) | Yes (pageStart/pageEnd) | **Maintained** |
| Structure Extraction | Yes (recursive) | Yes (agent-based) | **Maintained** |
| Section Summaries | Yes (concurrent) | Yes (agent-based) | **Maintained** |
| Document Description | Yes | Yes | **Maintained** |
| Hierarchical Tree | Yes (nodes array) | Yes (children array) | **Maintained** |
| Large Node Splitting | Yes (recursive) | Yes | **Maintained** |
| TOC Verification | Yes (accuracy check) | Simplified | **Simplified** |
| TOC Fix Retries | Yes (max 3 attempts) | No | **Not Implemented** |

### PageIndex Unique Features

| Feature | Description | Vectorless Status |
|---------|-------------|-------------------|
| `check_title_appearance` | Verifies TOC titles appear on claimed pages | Not implemented |
| `fix_incorrect_toc` | Attempts to fix incorrect page references | Not implemented |
| `verify_toc` | Calculates accuracy percentage | Not implemented |
| `process_large_node_recursively` | Splits large nodes recursively | Simplified |
| Markdown support | `page_index_md.py` for .md files | Not implemented |
| Page offset calculation | Handles TOC page vs physical page mismatch | Not implemented |

### Vectorless Unique Features

| Feature | Description |
|---------|-------------|
| **SSE Streaming** | Real-time progress events during processing |
| **DocumentIndex Component** | React UI for visualizing document structure |
| **Provider Agnostic** | Works with Gemini, OpenAI, Anthropic, etc. |
| **Compile-time Type Safety** | Full TypeScript with Zod validation |
| **Hexagonal Architecture** | Clean separation of concerns |
| **In-Memory Caching** | Fast, hash-based result caching |
| **AI SDK v6 ToolLoopAgent** | Modern agent implementation |
| **JSON Patch Events** | UI updates via RFC 6902 patches |

---

## API Comparison

### PageIndex (Python)

```python
from pageindex import PageIndex

# Initialize
pi = PageIndex(
    pdf_path="document.pdf",
    api_key="sk-...",
    base_url="https://api.openai.com/v1",
    model="gpt-4o"
)

# Generate index
result = pi.generate_index(
    max_depth=6,
    add_summaries=True,
    add_node_index=True
)

# Search
results = pi.search_with_reasoning(
    query="What is the revenue for Q4?",
    max_results=5
)
```

### Vectorless (TypeScript)

```typescript
import { generatePageIndex } from "@onegenui/vectorless";
import { createGeminiProvider } from "ai-sdk-provider-gemini-cli";

// Create model (provider agnostic)
const gemini = createGeminiProvider();
const model = gemini("gemini-3-flash-preview");

// Generate index
const result = await generatePageIndex(pdfBuffer, {
  model,
  addSummaries: true,
  addDescription: true,
  maxTocCheckPages: 20,
});

// Search (local implementation)
const sections = searchPageIndex(index, "revenue Q4");
```

---

## Data Structure Comparison

### Tree Node

**PageIndex (Python):**
```python
class PageIndexNode:
    title: str
    start_index: int
    end_index: int
    node_index: Optional[int]
    summary: Optional[str]
    nodes: List['PageIndexNode']
```

**Vectorless (TypeScript):**
```typescript
interface TreeNode {
  id?: string;
  title: string;
  level: number;
  pageStart?: number;
  pageEnd?: number;
  summary?: string;
  content?: string;
  children?: TreeNode[];
}
```

| Aspect | PageIndex | Vectorless |
|--------|-----------|------------|
| Page indexes | `start_index`, `end_index` | `pageStart`, `pageEnd` |
| Children | `nodes` | `children` |
| Hierarchy level | Implicit (depth) | Explicit `level` field |
| Content storage | Not stored | Optional `content` field |
| Node ID | `node_index` (auto) | `id` (UUID) |

---

## Processing Pipeline Comparison

### PageIndex Pipeline (Python)

1. **Load PDF** - `get_page_tokens()` extracts text + token counts
2. **Find TOC Pages** - `find_toc_pages()` scans first N pages
3. **Extract TOC Content** - `toc_extractor()` with page numbers detection
4. **Transform TOC** - `toc_transformer()` converts to JSON structure
5. **Add Physical Indices** - `toc_index_extractor()` maps TOC to actual pages
6. **Verify TOC** - `verify_toc()` checks accuracy (samples or all)
7. **Fix Incorrect** - `fix_incorrect_toc_with_retries()` up to 3 attempts
8. **Build Tree** - `tree_parser()` creates hierarchical structure
9. **Process Large Nodes** - `process_large_node_recursively()` splits big sections
10. **Generate Summaries** - `generate_summaries_for_structure()` concurrent
11. **Generate Description** - `generate_doc_description()` for document
12. **Return Result** - Final JSON with structure

### Vectorless Pipeline (TypeScript)

1. **Parse PDF** - `PdfParserAdapter.extractPages()` via pdf-parse
2. **Check Cache** - SHA-256 hash lookup in `MemoryCacheAdapter`
3. **TOC Detection** - `TocDetectorAgent.detectToc()` with streaming
4. **Structure Extraction** - `StructureExtractorAgent.extractStructure()` with SSE
5. **Summarization** - `SummarizerAgent.generateSummaries()` + document description
6. **Cache Result** - Store in memory cache
7. **Return Result** - `DocumentIndex` + SSE stream

**Key Differences:**
| Aspect | PageIndex | Vectorless |
|--------|-----------|------------|
| TOC Verification | Multi-step with retries | Single pass |
| Error Recovery | Automatic retry (3x) | None (fail fast) |
| Progress Events | None (batch) | SSE (real-time) |
| Caching | None | Hash-based |
| Agents | Sequential LLM calls | ToolLoopAgent streams |

---

## Configuration Comparison

### PageIndex Options

```python
# From config.yaml and run_pageindex.py
--model                 # OpenAI model (default: gpt-4o-2024-11-20)
--toc-check-pages       # Pages to check for TOC (default: 20)
--max-pages-per-node    # Max pages per node (default: 10)
--max-tokens-per-node   # Max tokens per node (default: 20000)
--if-add-node-id        # Add node ID (yes/no, default: yes)
--if-add-node-summary   # Add node summary (yes/no, default: yes)
--if-add-doc-description # Add doc description (yes/no, default: yes)
--if-add-node-text      # Add raw text to nodes (yes/no, default: no)
```

### Vectorless Options

```typescript
interface GenerateIndexOptions {
  model: LanguageModel;           // Required: AI SDK model
  addSummaries?: boolean;         // Generate summaries (default: true)
  addDescription?: boolean;       // Generate description (default: true)
  maxTocCheckPages?: number;      // Pages for TOC scan (default: 20)
}
```

| Option | PageIndex | Vectorless |
|--------|-----------|------------|
| Model | OpenAI only | Any AI SDK provider |
| TOC scan pages | Configurable | Configurable |
| Max pages/node | Configurable | Not configurable |
| Max tokens/node | Configurable | Not configurable |
| Node IDs | Optional | Always included |
| Summaries | Optional | Optional |
| Description | Optional | Optional |
| Raw text in nodes | Optional | Not supported |

---

## Missing Features Analysis

### Critical Missing Features

| Feature | Impact | Priority |
|---------|--------|----------|
| **TOC Verification** | May produce inaccurate page references | High |
| **TOC Fix Retries** | Cannot self-correct errors | High |
| **Markdown Support** | Limited to PDFs only | Medium |
| **Max Pages/Tokens per Node** | Cannot split large sections | Medium |

### Recommended Improvements

1. **Add TOC Verification**
   ```typescript
   // Verify that detected titles actually appear on claimed pages
   async function verifyToc(entries: TocEntry[], pages: Page[]): Promise<VerifyResult> {
     // Sample N entries and check with LLM
   }
   ```

2. **Add Retry Logic**
   ```typescript
   // Fix incorrect TOC entries with bounded retries
   async function fixIncorrectToc(
     entries: TocEntry[], 
     incorrect: TocEntry[], 
     maxAttempts: number = 3
   ): Promise<TocEntry[]>
   ```

3. **Add Node Size Limits**
   ```typescript
   interface GenerateIndexOptions {
     // ... existing
     maxPagesPerNode?: number;    // default: 10
     maxTokensPerNode?: number;   // default: 20000
   }
   ```

---

## Data Structure Comparison

### Tree Node

**PageIndex (Python):**
```python
{
    "title": "Financial Stability",
    "node_id": "0006",           # Sequential ID
    "start_index": 21,           # Page number (physical)
    "end_index": 22,             # Page number (physical)
    "summary": "The Federal Reserve ...",
    "nodes": [...]               # Children
}
```

**Vectorless (TypeScript):**
```typescript
{
    id: "uuid-...",              // UUID
    title: "Financial Stability",
    level: 1,                    // Explicit hierarchy level
    pageStart: 21,               // Page number
    pageEnd: 22,                 // Page number
    summary: "The Federal Reserve ...",
    content?: "...",             // Optional raw text
    children: [...]              // Children
}
```

| Aspect | PageIndex | Vectorless |
|--------|-----------|------------|
| ID format | Sequential (`0006`) | UUID |
| Page fields | `start_index`, `end_index` | `pageStart`, `pageEnd` |
| Children | `nodes` | `children` |
| Level | Implicit (depth) | Explicit `level` field |
| Raw text | Optional (`text` field) | Optional `content` field |

---

## Migration Guide

### From PageIndex to Vectorless

**1. Install Vectorless:**
```bash
pnpm add @onegenui/vectorless
```

**2. Update imports:**
```typescript
// Before
import { PageIndex } from './pageindex-service';

// After
import { generatePageIndex } from "@onegenui/vectorless";
```

**3. Convert API calls:**
```typescript
// Before
const result = await pageIndexClient.generateIndex(pdfPath);

// After
const buffer = await fs.readFile(pdfPath);
const result = await generatePageIndex(buffer, { model });
```

**4. Convert data structures:**
```typescript
// Legacy format conversion
function convertTreeNodeToLegacy(node: TreeNode): LegacyNode {
  return {
    title: node.title,
    start_index: node.pageStart,
    end_index: node.pageEnd,
    summary: node.summary,
    nodes: node.children?.map(convertTreeNodeToLegacy) || []
  };
}
```

---

## Conclusion

### Feature Parity Status

| Category | Status | Notes |
|----------|--------|-------|
| **Core Indexing** | Complete | TOC detection, structure extraction, summaries |
| **Tree Structure** | Complete | Hierarchical nodes with page ranges |
| **Document Description** | Complete | AI-generated document overview |
| **TOC Verification** | Missing | PageIndex verifies accuracy, Vectorless doesn't |
| **Error Recovery** | Missing | PageIndex retries, Vectorless fails fast |
| **Markdown Support** | Missing | PageIndex supports .md files |
| **Configuration** | Partial | Node size limits not configurable |

### Improvements in Vectorless

| Improvement | Benefit |
|-------------|---------|
| TypeScript native | No Python service needed, better IDE support |
| Provider agnostic | Use any LLM (Gemini, OpenAI, Anthropic, etc.) |
| SSE streaming | Real-time progress in UI |
| Hexagonal architecture | Easier testing and extension |
| In-memory caching | Faster repeated queries |
| React components | Built-in visualization |

### Regression Risks

1. **Accuracy**: Without TOC verification and fix retries, Vectorless may produce less accurate page references
2. **Large Documents**: Without configurable node size limits, very large sections may not be properly split
3. **Format Support**: Only PDFs supported (no Markdown)

### Recommendation

Vectorless is a solid **v1.0** that covers the core use case. For production use with critical documents, consider implementing:

1. TOC verification with accuracy scoring
2. Automatic retry logic for incorrect entries
3. Configurable node size limits

The architectural improvements (hexagonal, TypeScript, provider-agnostic) make these enhancements straightforward to add.


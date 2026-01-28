# Vectorless - Documentation

## Overview

**Vectorless** is a native TypeScript implementation of reasoning-based document indexing, inspired by [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex). It extracts hierarchical document structure from PDFs using AI agents, enabling intelligent document navigation and retrieval without vector databases or chunking.

### Key Features

- **No Vector DB** - Uses document structure and LLM reasoning instead of vector similarity
- **No Chunking** - Documents organized into natural sections, not artificial chunks
- **Human-like Retrieval** - Simulates how experts navigate complex documents
- **Streaming SSE** - Real-time progress events during indexing
- **Caching** - Hash-based caching for processed documents
- **Provider Agnostic** - Works with any AI SDK v6 compatible model

---

## Architecture

Vectorless follows **hexagonal architecture** (ports & adapters pattern):

```
packages/vectorless/
├── src/
│   ├── agents/              # AI agents using ToolLoopAgent
│   │   ├── toc-detector.ts      # Detects table of contents
│   │   ├── structure-extractor.ts # Extracts document hierarchy
│   │   ├── summarizer.ts        # Generates section summaries
│   │   └── index.ts             # Agent factory
│   │
│   ├── domain/              # Core business logic
│   │   └── schemas.ts           # Zod schemas (TreeNode, TocEntry, etc.)
│   │
│   ├── infrastructure/      # External adapters
│   │   ├── adapters/
│   │   │   ├── pdf-parse.ts     # PDF text extraction
│   │   │   └── memory-cache.ts  # In-memory caching
│   │   └── sse/
│   │       └── emitter.ts       # SSE event streaming
│   │
│   ├── ports/               # Interface definitions
│   │   └── index.ts             # Port interfaces
│   │
│   ├── use-cases/           # Application logic
│   │   └── generate-index.ts    # Main use case orchestrator
│   │
│   └── index.ts             # Public API
│
└── test/
    └── unit.test.ts         # Unit tests (16 tests)
```

---

## Installation

```bash
# In your monorepo
pnpm add @onegenui/vectorless
```

---

## Usage

### Basic Usage

```typescript
import { generatePageIndex } from "@onegenui/vectorless";
import { createGeminiProvider } from "ai-sdk-provider-gemini-cli";

// Create model
const gemini = createGeminiProvider();
const model = gemini("gemini-3-flash-preview");

// Generate index from PDF buffer
const result = await generatePageIndex(pdfBuffer, {
  model,
  addSummaries: true,
  addDescription: true,
  maxTocCheckPages: 20,
});

console.log(result);
// {
//   documentId: "uuid",
//   title: "Document Title",
//   description: "AI-generated description...",
//   totalPages: 42,
//   hasToc: true,
//   tocEndPage: 3,
//   tree: { ... hierarchical structure ... },
//   cached: false
// }
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `model` | `LanguageModel` | required | AI SDK v6 compatible language model |
| `addSummaries` | `boolean` | `true` | Generate summaries for each section |
| `addDescription` | `boolean` | `true` | Generate document-level description |
| `maxTocCheckPages` | `number` | `20` | Pages to scan for table of contents |

---

## Data Structures

### TreeNode

Represents a section in the document hierarchy:

```typescript
interface TreeNode {
  id?: string;              // Unique identifier
  title: string;            // Section title
  level: number;            // Depth (0 = root)
  pageStart?: number;       // Starting page
  pageEnd?: number;         // Ending page
  summary?: string;         // AI-generated summary
  content?: string;         // Raw text content
  children?: TreeNode[];    // Nested sections
}
```

### TocEntry

Represents an entry in the detected table of contents:

```typescript
interface TocEntry {
  title: string;      // Section title as in TOC
  pageNumber: number; // Page number
  level: number;      // Indentation level (0 = top)
}
```

### DocumentIndex

Complete index result:

```typescript
interface DocumentIndex {
  documentId: string;
  title: string;
  description?: string;
  totalPages: number;
  hasToc: boolean;
  tocEndPage?: number;
  tree: TreeNode;
  metadata?: {
    processedAt: string;
    modelUsed: string;
    processingTimeMs: number;
  };
}
```

---

## Agents

### TOC Detector Agent

Analyzes first N pages to detect table of contents:

```typescript
const tocDetector = createTocDetectorAgent(model);

for await (const result of tocDetector.detectToc(pages)) {
  // Yields SSE events + detected entries
  if (result.entries) {
    console.log("Found TOC with", result.entries.length, "entries");
  }
}
```

**Capabilities:**
- Detects explicit TOC (numbered sections with page refs)
- Detects implicit TOC (introduction sections, preface)
- Identifies TOC end page
- Extracts hierarchical levels

### Structure Extractor Agent

Builds hierarchical tree from document content:

```typescript
const extractor = createStructureExtractorAgent(model);

for await (const result of extractor.extractStructure(pages, tocEntries, tocEndPage)) {
  if (result.node) {
    console.log("Extracted structure:", result.node.title);
  }
}
```

**Capabilities:**
- Uses TOC entries as guide when available
- Infers structure from headings/formatting when no TOC
- Assigns accurate page ranges
- Handles nested sections up to 10 levels

### Summarizer Agent

Generates summaries for sections and document:

```typescript
const summarizer = createSummarizerAgent(model);

// Section summaries
for await (const result of summarizer.generateSummaries(tree, pages)) {
  if (result.summary) {
    console.log(`Summary for ${result.nodeId}:`, result.summary);
  }
}

// Document description
const description = await summarizer.generateDocumentDescription(tree);
```

**Capabilities:**
- 1-3 sentence section summaries
- Document-level description including type, topics, audience
- Concurrent processing for efficiency

---

## Ports (Interfaces)

### PdfParserPort

```typescript
interface PdfParserPort {
  extractPages(pdfBuffer: ArrayBuffer): Promise<Page[]>;
  getTotalPages(pdfBuffer: ArrayBuffer): Promise<number>;
}
```

### CachePort

```typescript
interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
```

### SSEEmitterPort

```typescript
interface SSEEmitterPort {
  emit(event: SSEEvent): void;
  flush(): Promise<void>;
  close(): void;
  getStream(): ReadableStream<Uint8Array>;
}
```

---

## SSE Events

Events emitted during processing:

| Event Type | Description | Data |
|------------|-------------|------|
| `started` | Processing began | `{ contentHash }` |
| `progress` | Step progress | `{ step, progress, totalPages }` |
| `toc_detected` | TOC found | `{ entriesCount, tocEndPage }` |
| `node_created` | Structure extracted | `{ title, childrenCount }` |
| `summary_generated` | Summary created | `{ nodeId, title, progress }` |
| `completed` | Processing done | `{ documentId }` |
| `error` | Error occurred | `{ message }` |

---

## Caching

Documents are cached by content hash (SHA-256):

```typescript
// Cache key format
`index:${sha256Hash}`

// Automatic cache check
const result = await generatePageIndex(buffer, options);
if (result.cached) {
  console.log("Served from cache!");
}
```

The global `MemoryCacheAdapter` persists across requests in the same process.

---

## Integration with Next.js

### pageindex-client.ts

```typescript
import { generatePageIndex as generatePageIndexV2 } from "@onegenui/vectorless";
import { createGeminiProvider } from "ai-sdk-provider-gemini-cli";

function createGeminiModel() {
  const gemini = createGeminiProvider();
  return gemini("gemini-3-flash-preview");
}

export async function generatePageIndex(buffer, fileName, mimeType) {
  const model = createGeminiModel();
  const result = await generatePageIndexV2(buffer, {
    model: model as any,
    addSummaries: true,
    addDescription: true,
  });
  
  // Convert to legacy format if needed
  return convertToLegacyFormat(result);
}
```

### DocumentIndex UI Component

```tsx
// packages/components/src/domain/DocumentIndex/component.tsx

<DocumentIndex
  title="Annual Report 2024"
  description="Financial statements and analysis..."
  pageCount={156}
  nodes={[
    {
      title: "Executive Summary",
      nodeId: "001",
      startPage: 1,
      endPage: 5,
      summary: "Overview of company performance...",
      children: [...]
    }
  ]}
  accentColor="#3b82f6"
/>
```

---

## Testing

```bash
cd packages/vectorless
pnpm test
```

**Test Coverage:**
- Domain schemas validation (TreeNode, TocEntry, SSEEvent)
- MemoryCacheAdapter operations (get, set, delete, TTL)
- SSEEmitterAdapter streaming
- Page interface typing

---

## Comparison with Original PageIndex

| Feature | Original PageIndex | Vectorless |
|---------|-------------------|------------|
| Language | Python | TypeScript |
| AI Framework | OpenAI API direct | AI SDK v6 (ToolLoopAgent) |
| Streaming | None | SSE real-time events |
| Caching | File-based | In-memory (extensible) |
| Architecture | Monolithic | Hexagonal (ports/adapters) |
| Provider | OpenAI only | Any AI SDK provider |
| UI Integration | None | React components |

---

## License

MIT - Based on [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex)

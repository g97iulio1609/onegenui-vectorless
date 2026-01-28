# Vectorless 2.0 - Knowledge Extraction & Interactive Exploration

Vectorless 2.0 transforms document processing from simple PDF indexing to a comprehensive Knowledge Extraction & Interactive Exploration system. It extracts structured knowledge from documents, builds a queryable knowledge base, and provides AI-powered Q&A capabilities.

## Features

- **Multi-Format Support**: PDF, Word (.docx), Excel (.xlsx), Markdown, and plain text
- **Entity Extraction**: People, places, dates, organizations, concepts, events
- **Relation Discovery**: Find connections between document sections
- **Quote Extraction**: Identify significant quotes with attribution
- **Knowledge Base**: Build a structured, queryable knowledge graph
- **AI Q&A**: Ask questions and get sourced answers from documents
- **MCP Integration**: Use as MCP tools in AI chat applications

## Quick Start

### Generate a Page Index (PDF)

```typescript
import { generatePageIndex } from "@onegenui/vectorless";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
const model = google("gemini-2.0-flash-exp");

const pdfBuffer = fs.readFileSync("document.pdf");
const result = await generatePageIndex(pdfBuffer, { model });

console.log(result.tree); // Document structure tree
console.log(result.title); // Document title
console.log(result.hasToc); // Whether TOC was detected
```

### Generate a Knowledge Base

```typescript
import { generateKnowledgeBase } from "@onegenui/vectorless";

const buffer = fs.readFileSync("document.pdf");
const result = await generateKnowledgeBase(buffer, "document.pdf", "application/pdf", {
  model,
  extractEntities: true,
  extractRelations: true,
  extractQuotes: true,
  extractKeywords: true,
  extractCitations: true,
  generateSummaries: true,
  generateKeyInsights: true,
});

const kb = result.knowledgeBase;

console.log(kb.entities); // Extracted entities
console.log(kb.relations); // Entity relations
console.log(kb.quotes); // Significant quotes
console.log(kb.keywords); // Document keywords
console.log(kb.keyInsights); // AI-generated insights
```

## Architecture

Vectorless 2.0 follows a hexagonal architecture pattern:

```
┌─────────────────────────────────────────────────────┐
│                   Application                        │
│  ┌─────────────────────────────────────────────┐    │
│  │              Use Cases                       │    │
│  │  • GenerateIndexUseCase                      │    │
│  │  • GenerateKnowledgeBaseUseCase              │    │
│  │  • AnswerQuestionUseCase                     │    │
│  │  • DeepDiveUseCase                           │    │
│  └─────────────────────────────────────────────┘    │
│                        ↑                             │
│                      Ports                           │
│                        ↓                             │
│  ┌─────────────────────────────────────────────┐    │
│  │              Adapters                        │    │
│  │  • PdfParseAdapter                           │    │
│  │  • MammothAdapter (Word)                     │    │
│  │  • XlsxAdapter (Excel)                       │    │
│  │  • MarkdownAdapter                           │    │
│  │  • MemoryCacheAdapter                        │    │
│  │  • MemoryKnowledgeBaseRepository             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Domain Types

### Entity

```typescript
interface Entity {
  id: string;
  type: "person" | "date" | "place" | "concept" | "organization" | "event" | "number" | "term";
  value: string;
  normalized?: string;
  description?: string;
  occurrences: Array<{
    nodeId: string;
    pageNumber: number;
    position?: number;
    context?: string;
  }>;
  confidence?: number;
}
```

### Relation

```typescript
interface Relation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: "references" | "contradicts" | "supports" | "elaborates" | "precedes" | "follows" | "summarizes" | "defines" | "examples";
  confidence: number;
  evidence?: string;
}
```

### Quote

```typescript
interface Quote {
  id: string;
  text: string;
  pageNumber: number;
  nodeId: string;
  significance: "key" | "supporting" | "notable";
  speaker?: string;
  context?: string;
}
```

### KnowledgeNode

```typescript
interface KnowledgeNode {
  id: string;
  title: string;
  level: number;
  pageStart: number;
  pageEnd: number;
  summary: string;
  detailedSummary?: string;
  keyPoints: string[];
  entities: Array<{ entityId: string; relevance?: number }>;
  keywords: string[];
  quotes: Array<{ quoteId: string }>;
  internalRefs: string[];
  externalRefs: Array<{ citationId: string }>;
  metrics?: {
    wordCount: number;
    complexity: "low" | "medium" | "high";
    importance: number;
    readingTimeMinutes: number;
    depth: number;
  };
  rawText?: string;
  children: KnowledgeNode[];
}
```

### DocumentKnowledgeBase

```typescript
interface DocumentKnowledgeBase {
  id: string;
  filename: string;
  mimeType: string;
  hash: string;
  processedAt: string;
  totalPages: number;
  totalTokens: number;
  tree: KnowledgeNode;
  entities: Entity[];
  relations: Relation[];
  keywords: Keyword[];
  quotes: Quote[];
  citations: Citation[];
  metrics: DocumentMetrics;
  description: string;
  keyInsights: string[];
}
```

## MCP Tools

Vectorless provides MCP (Model Context Protocol) tools for integration with AI chat:

### pdf-index

Generate a structured index from a PDF document.

```json
{
  "name": "pdf-index",
  "arguments": {
    "url": "https://example.com/document.pdf",
    "addSummaries": true,
    "addDescription": true
  }
}
```

### generate-knowledge-base

Extract a full knowledge base from a document.

```json
{
  "name": "generate-knowledge-base",
  "arguments": {
    "url": "https://example.com/document.pdf",
    "extractEntities": true,
    "extractRelations": true,
    "extractQuotes": true
  }
}
```

### answer-question

Ask questions about a processed knowledge base.

```json
{
  "name": "answer-question",
  "arguments": {
    "knowledgeBaseId": "kb-123",
    "question": "What are the main findings?"
  }
}
```

### list-knowledge-bases

List all processed knowledge bases.

```json
{
  "name": "list-knowledge-bases",
  "arguments": {}
}
```

## React Components

Vectorless 2.0 includes React components for visualization:

### DocumentExplorer

Navigate the document tree structure.

```tsx
import { DocumentExplorer } from "@onegenui/components";

<DocumentExplorer
  tree={knowledgeBase.tree}
  onNodeSelect={(node) => console.log(node)}
  expandedByDefault={true}
/>
```

### EntityExplorer

Browse and filter extracted entities.

```tsx
import { EntityExplorer } from "@onegenui/components";

<EntityExplorer
  entities={knowledgeBase.entities}
  onEntityClick={(entity) => console.log(entity)}
  filterTypes={["person", "organization"]}
/>
```

### KnowledgeGraph

Visualize entity relationships.

```tsx
import { KnowledgeGraph } from "@onegenui/components";

<KnowledgeGraph
  entities={knowledgeBase.entities}
  relations={knowledgeBase.relations}
  onNodeClick={(entity) => console.log(entity)}
/>
```

### DocumentTimeline

Display date/event entities on a timeline.

```tsx
import { DocumentTimeline } from "@onegenui/components";

<DocumentTimeline
  entities={knowledgeBase.entities}
  onEntityClick={(entity) => console.log(entity)}
/>
```

### CitationViewer

Display document citations.

```tsx
import { CitationViewer } from "@onegenui/components";

<CitationViewer
  citations={knowledgeBase.citations}
  onCitationClick={(citation) => console.log(citation)}
/>
```

### DeepAnalysisPanel

Show detailed analysis for a selected node.

```tsx
import { DeepAnalysisPanel } from "@onegenui/components";

<DeepAnalysisPanel
  node={selectedNode}
  entities={knowledgeBase.entities}
/>
```

## React Hooks

### useKnowledgeBase

Manage knowledge base state and queries.

```tsx
import { useKnowledgeBase } from "@onegenui/components";

const {
  knowledgeBase,
  setKnowledgeBase,
  entities,
  relations,
  quotes,
  getEntityById,
  getRelationsByNode,
  searchEntities,
  filterEntitiesByType,
} = useKnowledgeBase({ initialKnowledgeBase: kb });
```

### useDocumentExplorer

Manage document tree navigation state.

```tsx
import { useDocumentExplorer } from "@onegenui/components";

const {
  tree,
  selectedNode,
  expandedNodes,
  selectNode,
  toggleNode,
  expandAll,
  collapseAll,
  searchNodes,
  getNodePath,
} = useDocumentExplorer({ initialTree: kb.tree });
```

### useQuestionAnswer

Manage Q&A interaction state.

```tsx
import { useQuestionAnswer } from "@onegenui/components";

const {
  question,
  setQuestion,
  answer,
  isLoading,
  error,
  askQuestion,
  clearAnswer,
  history,
} = useQuestionAnswer();
```

## Extraction Agents

The following AI agents are available for customized extraction:

- **EntityExtractorAgent**: Extract named entities from text
- **RelationExtractorAgent**: Discover relations between sections
- **QuoteExtractorAgent**: Identify significant quotes
- **KeywordExtractorAgent**: Extract keywords with TF-IDF scoring
- **MetricsCalculatorAgent**: Calculate document metrics
- **CitationResolverAgent**: Parse and structure citations
- **QuestionAnswerAgent**: Answer questions from knowledge base
- **DeepDiveAgent**: Provide detailed analysis of topics

## API Reference

### generatePageIndex(buffer, options)

Generate a page index from a PDF document.

**Parameters:**
- `buffer`: `Buffer | ArrayBuffer` - PDF file contents
- `options`: `PageIndexOptions` - Configuration options

**Returns:** `Promise<PageIndexResult>`

### generateKnowledgeBase(buffer, filename, mimeType, options)

Generate a full knowledge base from a document.

**Parameters:**
- `buffer`: `Buffer | ArrayBuffer` - Document contents
- `filename`: `string` - Original filename
- `mimeType`: `string` - Document MIME type
- `options`: `KnowledgeBaseOptions` - Configuration options

**Returns:** `Promise<KnowledgeBaseResult>`

## License

Apache 2.0

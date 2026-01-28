# AGENTS.md - @onegenui/vectorless

AI-powered document structure extraction without vector databases.

## Purpose

This package provides:
- **Document Parsing**: Extract structure from PDFs, DOCX, etc.
- **TOC Extraction**: Build table of contents from documents
- **Content Chunking**: Intelligent content segmentation
- **AI Agents**: LLM-powered structure analysis

## Architecture (Hexagonal)

```
src/
├── index.ts              # Public exports
├── domain/               # Core business logic
├── ports/                # Interface definitions
├── use-cases/            # Application logic
├── infrastructure/       # External service adapters
└── agents/               # AI agent implementations
    └── toc-verifier.ts   # TOC verification agent (NEEDS REFACTORING)
```

## Key Exports

```typescript
export { extractDocumentStructure } from './use-cases/extract-structure';
export { DocumentParser } from './infrastructure/parser';
export type { DocumentStructure, TOCEntry } from './domain/types';
```

## Development Guidelines

- Follow hexagonal architecture (ports & adapters)
- Keep domain logic pure and framework-agnostic
- Use dependency injection for external services
- Support multiple document formats
- Handle large documents efficiently

## Refactoring Priorities (from toBeta.md)

| File | LOC | Priority |
|------|-----|----------|
| `agents/toc-verifier.ts` | 495 | P2 |

## Testing

```bash
pnpm --filter @onegenui/vectorless test
pnpm --filter @onegenui/vectorless type-check
```

Tests are located in `test/` directory using Vitest.

## Dependencies

- `ai` ^6.0.0 (Vercel AI SDK)
- `zod` ^3.24.1 (note: should migrate to v4)
- `pdf-parse` ^1.1.1
- `@onegenui/providers` (peer dependency)

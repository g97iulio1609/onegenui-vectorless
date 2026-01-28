/**
 * PostgreSQL Knowledge Base Repository
 *
 * Production adapter for storing knowledge bases in PostgreSQL.
 * Uses raw SQL for maximum compatibility (no Prisma dependency in core).
 *
 * Schema:
 * ```sql
 * CREATE TABLE knowledge_bases (
 *   id TEXT PRIMARY KEY,
 *   filename TEXT NOT NULL,
 *   mime_type TEXT NOT NULL,
 *   hash TEXT NOT NULL,
 *   processed_at TIMESTAMPTZ NOT NULL,
 *   total_pages INTEGER NOT NULL,
 *   total_tokens INTEGER NOT NULL,
 *   tree JSONB NOT NULL,
 *   entities JSONB NOT NULL,
 *   relations JSONB NOT NULL,
 *   keywords JSONB NOT NULL,
 *   quotes JSONB NOT NULL,
 *   citations JSONB NOT NULL,
 *   metrics JSONB NOT NULL,
 *   description TEXT NOT NULL,
 *   key_insights JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_kb_hash ON knowledge_bases(hash);
 * CREATE INDEX idx_kb_filename ON knowledge_bases(filename);
 * CREATE INDEX idx_kb_tree_gin ON knowledge_bases USING GIN(tree);
 * CREATE INDEX idx_kb_entities_gin ON knowledge_bases USING GIN(entities);
 * ```
 */
export class PostgresKBRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async save(kb) {
        const sql = `
      INSERT INTO knowledge_bases (
        id, filename, mime_type, hash, processed_at, total_pages, total_tokens,
        tree, entities, relations, keywords, quotes, citations, metrics,
        description, key_insights, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (id) DO UPDATE SET
        filename = EXCLUDED.filename,
        mime_type = EXCLUDED.mime_type,
        hash = EXCLUDED.hash,
        processed_at = EXCLUDED.processed_at,
        total_pages = EXCLUDED.total_pages,
        total_tokens = EXCLUDED.total_tokens,
        tree = EXCLUDED.tree,
        entities = EXCLUDED.entities,
        relations = EXCLUDED.relations,
        keywords = EXCLUDED.keywords,
        quotes = EXCLUDED.quotes,
        citations = EXCLUDED.citations,
        metrics = EXCLUDED.metrics,
        description = EXCLUDED.description,
        key_insights = EXCLUDED.key_insights,
        updated_at = NOW()
    `;
        await this.client.query(sql, [
            kb.id,
            kb.filename,
            kb.mimeType,
            kb.hash,
            kb.processedAt,
            kb.totalPages,
            kb.totalTokens,
            JSON.stringify(kb.tree),
            JSON.stringify(kb.entities),
            JSON.stringify(kb.relations),
            JSON.stringify(kb.keywords),
            JSON.stringify(kb.quotes),
            JSON.stringify(kb.citations),
            JSON.stringify(kb.metrics),
            kb.description,
            JSON.stringify(kb.keyInsights),
        ]);
    }
    async get(id) {
        const sql = `SELECT * FROM knowledge_bases WHERE id = $1`;
        const result = await this.client.query(sql, [id]);
        if (result.rows.length === 0)
            return null;
        return this.rowToKB(result.rows[0]);
    }
    async getByHash(hash) {
        const sql = `SELECT * FROM knowledge_bases WHERE hash = $1`;
        const result = await this.client.query(sql, [hash]);
        if (result.rows.length === 0)
            return null;
        return this.rowToKB(result.rows[0]);
    }
    async list(options) {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;
        const sql = `
      SELECT * FROM knowledge_bases
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `;
        const result = await this.client.query(sql, [limit, offset]);
        return result.rows.map((row) => this.rowToKB(row));
    }
    async delete(id) {
        const sql = `DELETE FROM knowledge_bases WHERE id = $1`;
        await this.client.query(sql, [id]);
        return true;
    }
    async search(query, limit = 10) {
        const sql = `
      SELECT * FROM knowledge_bases
      WHERE 
        to_tsvector('english', description || ' ' || filename) @@ plainto_tsquery('english', $1)
        OR filename ILIKE $2
        OR description ILIKE $2
      ORDER BY updated_at DESC
      LIMIT $3
    `;
        const result = await this.client.query(sql, [
            query,
            `%${query}%`,
            limit,
        ]);
        return result.rows.map((row) => this.rowToKB(row));
    }
    rowToKB(row) {
        return {
            id: row.id,
            filename: row.filename,
            mimeType: row.mime_type,
            hash: row.hash,
            processedAt: row.processed_at,
            totalPages: row.total_pages,
            totalTokens: row.total_tokens,
            tree: typeof row.tree === "string" ? JSON.parse(row.tree) : row.tree,
            entities: typeof row.entities === "string"
                ? JSON.parse(row.entities)
                : row.entities,
            relations: typeof row.relations === "string"
                ? JSON.parse(row.relations)
                : row.relations,
            keywords: typeof row.keywords === "string"
                ? JSON.parse(row.keywords)
                : row.keywords,
            quotes: typeof row.quotes === "string" ? JSON.parse(row.quotes) : row.quotes,
            citations: typeof row.citations === "string"
                ? JSON.parse(row.citations)
                : row.citations,
            metrics: typeof row.metrics === "string" ? JSON.parse(row.metrics) : row.metrics,
            description: row.description,
            keyInsights: typeof row.key_insights === "string"
                ? JSON.parse(row.key_insights)
                : row.key_insights,
        };
    }
}
export const CREATE_KB_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  hash TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL,
  total_pages INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  tree JSONB NOT NULL,
  entities JSONB NOT NULL,
  relations JSONB NOT NULL,
  keywords JSONB NOT NULL,
  quotes JSONB NOT NULL,
  citations JSONB NOT NULL,
  metrics JSONB NOT NULL,
  description TEXT NOT NULL,
  key_insights JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_hash ON knowledge_bases(hash);
CREATE INDEX IF NOT EXISTS idx_kb_filename ON knowledge_bases(filename);
CREATE INDEX IF NOT EXISTS idx_kb_tree_gin ON knowledge_bases USING GIN(tree);
CREATE INDEX IF NOT EXISTS idx_kb_entities_gin ON knowledge_bases USING GIN(entities);
`;
export function createPostgresKBRepository(client) {
    return new PostgresKBRepository(client);
}
//# sourceMappingURL=postgres-kb-repository.js.map
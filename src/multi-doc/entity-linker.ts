import type { Entity } from '../domain/schemas.js';
import type { EntityLink } from '../ports/multi-doc.port.js';

/**
 * Links entities across documents by normalizing labels.
 * Entities with same normalized label from different docs get the same canonicalId.
 */
export class EntityLinker {
  private canonicalMap = new Map<string, string>(); // normalized → canonicalId
  private links: EntityLink[] = [];
  private counter = 0;

  /** Link entities from a document, return created links */
  linkEntities(documentId: string, entities: Entity[]): EntityLink[] {
    const newLinks: EntityLink[] = [];
    for (const entity of entities) {
      const normalized = this.normalize(entity.normalized ?? entity.value);
      let canonicalId = this.canonicalMap.get(normalized);
      if (!canonicalId) {
        canonicalId = `canonical-${this.counter++}`;
        this.canonicalMap.set(normalized, canonicalId);
      }
      const link: EntityLink = {
        entityId: entity.id,
        documentId,
        canonicalId,
      };
      this.links.push(link);
      newLinks.push(link);
    }
    return newLinks;
  }

  /** Get all links for an entity by its ID */
  getLinks(entityId: string): EntityLink[] {
    const link = this.links.find((l) => l.entityId === entityId);
    if (!link) return [];
    return this.links.filter((l) => l.canonicalId === link.canonicalId);
  }

  /** Get all links for a canonical entity */
  getLinksByCanonical(canonicalId: string): EntityLink[] {
    return this.links.filter((l) => l.canonicalId === canonicalId);
  }

  /** Remove all links for a document */
  removeDocument(documentId: string): void {
    this.links = this.links.filter((l) => l.documentId !== documentId);
  }

  private normalize(value: string): string {
    return value.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}

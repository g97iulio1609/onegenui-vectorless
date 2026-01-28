/**
 * PowerPoint Parser Adapter
 * Extracts text content from .pptx files using JSZip
 */

import type { PowerPointParserPort, Page } from "../../ports/index.js";

export class PptxParserAdapter implements PowerPointParserPort {
  async extractPages(buffer: ArrayBuffer): Promise<Page[]> {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const slides: Page[] = [];
    const slideFiles = Object.keys(zip.files)
      .filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
        return numA - numB;
      });

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i]!;
      const file = zip.files[slideFile];
      if (!file) continue;
      const content = await file.async("string");
      const text = this.extractTextFromXml(content);
      slides.push({
        pageNumber: i + 1,
        content: text.trim(),
      });
    }

    return slides;
  }

  private extractTextFromXml(xml: string): string {
    // Extract text from <a:t> tags (PowerPoint text elements)
    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const texts = textMatches.map((match) => {
      const text = match.replace(/<[^>]+>/g, "");
      return text;
    });

    // Group by paragraphs (rough heuristic based on </a:p>)
    const paragraphs: string[] = [];
    let currentParagraph = "";

    for (const text of texts) {
      currentParagraph += text;
      if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!")) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    return paragraphs.join("\n");
  }
}

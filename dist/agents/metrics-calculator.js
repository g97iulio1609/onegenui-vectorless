export class MetricsCalculatorAgent {
    async calculateMetrics(pages, _tree) {
        const allText = pages.map((p) => p.content).join("\n");
        const words = allText.split(/\s+/).filter((w) => w.length > 0);
        const totalWords = words.length;
        const sentences = allText
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0);
        const sentenceCount = sentences.length;
        const paragraphs = allText
            .split(/\n\n+/)
            .filter((p) => p.trim().length > 0);
        const paragraphCount = paragraphs.length;
        const totalCharacters = allText.length;
        const totalPages = pages.length;
        // Calculate vocabulary richness (unique words / total words)
        const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
        const vocabularyRichness = uniqueWords.size / Math.max(1, totalWords);
        // Reading time: average 200 words per minute
        const readingTimeMinutes = Math.ceil(totalWords / 200);
        // Complexity score based on average sentence length and vocabulary
        const avgSentenceLength = totalWords / Math.max(1, sentenceCount);
        const complexityScore = Math.min(100, Math.round(avgSentenceLength * 2 + vocabularyRichness * 50));
        return {
            totalWords,
            totalCharacters,
            averageWordsPerPage: totalPages > 0 ? totalWords / totalPages : 0,
            readingTimeMinutes,
            complexityScore,
            vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
            sentenceCount,
            averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
            paragraphCount,
        };
    }
}
//# sourceMappingURL=metrics-calculator.js.map
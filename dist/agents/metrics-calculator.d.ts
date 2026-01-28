import type { MetricsCalculatorPort, Page } from "../ports/index.js";
import type { TreeNode, DocumentMetrics } from "../domain/schemas.js";
export declare class MetricsCalculatorAgent implements MetricsCalculatorPort {
    calculateMetrics(pages: Page[], _tree: TreeNode): Promise<DocumentMetrics>;
}
//# sourceMappingURL=metrics-calculator.d.ts.map
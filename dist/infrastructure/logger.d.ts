export interface VectorlessLogger {
    sessionId: string;
    logPath: string;
    debug(component: string, message: string, data?: unknown): void;
    info(component: string, message: string, data?: unknown): void;
    warn(component: string, message: string, data?: unknown): void;
    error(component: string, message: string, data?: unknown): void;
    raw(component: string, label: string, content: string): void;
}
export declare function createSessionLogger(sessionId: string, logsDir?: string): VectorlessLogger;
export declare function getGlobalLogger(): VectorlessLogger;
//# sourceMappingURL=logger.d.ts.map
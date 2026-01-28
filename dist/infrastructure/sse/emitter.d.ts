import type { SSEEvent } from "../../domain/schemas.js";
import type { SSEEmitterPort } from "../../ports/index.js";
export declare class SSEEmitterAdapter implements SSEEmitterPort {
    private buffer;
    private encoder;
    private controller;
    private stream;
    private flushTimer;
    private closed;
    constructor();
    private scheduleFlush;
    emit(event: SSEEvent): void;
    flush(): Promise<void>;
    close(): void;
    getStream(): ReadableStream<Uint8Array>;
}
export declare function createSSEResponse(emitter: SSEEmitterPort): Response;
//# sourceMappingURL=emitter.d.ts.map
const FLUSH_INTERVAL_MS = 50;
export class SSEEmitterAdapter {
    buffer = [];
    encoder = new TextEncoder();
    controller = null;
    stream;
    flushTimer = null;
    closed = false;
    constructor() {
        this.stream = new ReadableStream({
            start: (controller) => {
                this.controller = controller;
                this.scheduleFlush();
            },
            cancel: () => {
                this.close();
            },
        });
    }
    scheduleFlush() {
        if (this.flushTimer || this.closed)
            return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flush();
            if (!this.closed) {
                this.scheduleFlush();
            }
        }, FLUSH_INTERVAL_MS);
    }
    emit(event) {
        if (this.closed)
            return;
        this.buffer.push(event);
        if (event.type === "completed" || event.type === "error") {
            void this.flush();
        }
    }
    async flush() {
        if (this.buffer.length === 0 || !this.controller || this.closed)
            return;
        const events = this.buffer;
        this.buffer = [];
        for (const event of events) {
            const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
            this.controller.enqueue(this.encoder.encode(sseData));
        }
    }
    close() {
        if (this.closed)
            return;
        this.closed = true;
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        void this.flush().then(() => {
            this.controller?.close();
        });
    }
    getStream() {
        return this.stream;
    }
}
export function createSSEResponse(emitter) {
    return new Response(emitter.getStream(), {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
//# sourceMappingURL=emitter.js.map
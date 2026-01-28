import type { SSEEvent } from "../../domain/schemas.js";
import type { SSEEmitterPort } from "../../ports/index.js";

const FLUSH_INTERVAL_MS = 50;

export class SSEEmitterAdapter implements SSEEmitterPort {
  private buffer: SSEEvent[] = [];
  private encoder = new TextEncoder();
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private stream: ReadableStream<Uint8Array>;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor() {
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
        this.scheduleFlush();
      },
      cancel: () => {
        this.close();
      },
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer || this.closed) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
      if (!this.closed) {
        this.scheduleFlush();
      }
    }, FLUSH_INTERVAL_MS);
  }

  emit(event: SSEEvent): void {
    if (this.closed) return;
    this.buffer.push(event);

    if (event.type === "completed" || event.type === "error") {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.controller || this.closed) return;

    const events = this.buffer;
    this.buffer = [];

    for (const event of events) {
      const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
      this.controller.enqueue(this.encoder.encode(sseData));
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    void this.flush().then(() => {
      this.controller?.close();
    });
  }

  getStream(): ReadableStream<Uint8Array> {
    return this.stream;
  }
}

export function createSSEResponse(emitter: SSEEmitterPort): Response {
  return new Response(emitter.getStream(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

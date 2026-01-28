export interface VectorlessLogger {
  sessionId: string;
  logPath: string;
  debug(component: string, message: string, data?: unknown): void;
  info(component: string, message: string, data?: unknown): void;
  warn(component: string, message: string, data?: unknown): void;
  error(component: string, message: string, data?: unknown): void;
  raw(component: string, label: string, content: string): void;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(
  level: string,
  component: string,
  message: string,
  data?: unknown,
): string {
  const timestamp = formatTimestamp();
  let entry = `[${timestamp}] [${level}] [${component}] ${message}`;
  if (data !== undefined) {
    entry += ` - ${JSON.stringify(data)}`;
  }
  return entry;
}

// Check if we're in a Node.js environment with fs support
const isNodeEnv =
  typeof process !== "undefined" &&
  typeof process.versions !== "undefined" &&
  process.versions.node !== undefined;

export function createSessionLogger(
  sessionId: string,
  logsDir?: string,
): VectorlessLogger {
  // In non-Node environments (Edge, browser), use console logging
  if (!isNodeEnv) {
    return createConsoleLogger(sessionId);
  }

  // Dynamically import fs only in Node.js
  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const fs = require("fs");
    const path = require("path");

    const dir = logsDir || process.env.VECTORLESS_LOGS_DIR || "./vectorless-logs";

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const logPath = path.join(dir, `vectorless-${sessionId}.log`);

    // Write session start
    const startEntry = formatLogEntry(
      "INFO",
      "SESSION",
      `=== Session ${sessionId} started ===`,
    );
    fs.appendFileSync(logPath, startEntry + "\n");

    function writeLog(
      level: string,
      component: string,
      message: string,
      data?: unknown,
    ): void {
      const entry = formatLogEntry(level, component, message, data);
      fs.appendFileSync(logPath, entry + "\n");
    }

    return {
      sessionId,
      logPath,

      debug(component: string, message: string, data?: unknown): void {
        writeLog("DEBUG", component, message, data);
      },

      info(component: string, message: string, data?: unknown): void {
        writeLog("INFO", component, message, data);
      },

      warn(component: string, message: string, data?: unknown): void {
        writeLog("WARN", component, message, data);
      },

      error(component: string, message: string, data?: unknown): void {
        writeLog("ERROR", component, message, data);
      },

      raw(component: string, label: string, content: string): void {
        const timestamp = formatTimestamp();
        const entry = `[${timestamp}] [RAW] [${component}] ${label}\n--- BEGIN ---\n${content}\n--- END ---\n`;
        fs.appendFileSync(logPath, entry);
      },
    };
  } catch {
    // Fallback to console if fs fails
    return createConsoleLogger(sessionId);
  }
}

function createConsoleLogger(sessionId: string): VectorlessLogger {
  return {
    sessionId,
    logPath: "console",

    debug(component: string, message: string, data?: unknown): void {
      console.debug(formatLogEntry("DEBUG", component, message, data));
    },

    info(component: string, message: string, data?: unknown): void {
      console.info(formatLogEntry("INFO", component, message, data));
    },

    warn(component: string, message: string, data?: unknown): void {
      console.warn(formatLogEntry("WARN", component, message, data));
    },

    error(component: string, message: string, data?: unknown): void {
      console.error(formatLogEntry("ERROR", component, message, data));
    },

    raw(component: string, label: string, content: string): void {
      console.log(`[RAW] [${component}] ${label}\n${content}`);
    },
  };
}

// Global logger for when session is not yet created
let globalLogger: VectorlessLogger | null = null;

export function getGlobalLogger(): VectorlessLogger {
  if (!globalLogger) {
    globalLogger = createSessionLogger("global");
  }
  return globalLogger;
}

function formatTimestamp() {
    return new Date().toISOString();
}
function formatLogEntry(level, component, message, data) {
    const timestamp = formatTimestamp();
    let entry = `[${timestamp}] [${level}] [${component}] ${message}`;
    if (data !== undefined) {
        entry += ` - ${JSON.stringify(data)}`;
    }
    return entry;
}
// Check if we're in a Node.js environment with fs support
const isNodeEnv = typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    process.versions.node !== undefined;
export function createSessionLogger(sessionId, logsDir) {
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
        const startEntry = formatLogEntry("INFO", "SESSION", `=== Session ${sessionId} started ===`);
        fs.appendFileSync(logPath, startEntry + "\n");
        function writeLog(level, component, message, data) {
            const entry = formatLogEntry(level, component, message, data);
            fs.appendFileSync(logPath, entry + "\n");
        }
        return {
            sessionId,
            logPath,
            debug(component, message, data) {
                writeLog("DEBUG", component, message, data);
            },
            info(component, message, data) {
                writeLog("INFO", component, message, data);
            },
            warn(component, message, data) {
                writeLog("WARN", component, message, data);
            },
            error(component, message, data) {
                writeLog("ERROR", component, message, data);
            },
            raw(component, label, content) {
                const timestamp = formatTimestamp();
                const entry = `[${timestamp}] [RAW] [${component}] ${label}\n--- BEGIN ---\n${content}\n--- END ---\n`;
                fs.appendFileSync(logPath, entry);
            },
        };
    }
    catch {
        // Fallback to console if fs fails
        return createConsoleLogger(sessionId);
    }
}
function createConsoleLogger(sessionId) {
    return {
        sessionId,
        logPath: "console",
        debug(component, message, data) {
            console.debug(formatLogEntry("DEBUG", component, message, data));
        },
        info(component, message, data) {
            console.info(formatLogEntry("INFO", component, message, data));
        },
        warn(component, message, data) {
            console.warn(formatLogEntry("WARN", component, message, data));
        },
        error(component, message, data) {
            console.error(formatLogEntry("ERROR", component, message, data));
        },
        raw(component, label, content) {
            console.log(`[RAW] [${component}] ${label}\n${content}`);
        },
    };
}
// Global logger for when session is not yet created
let globalLogger = null;
export function getGlobalLogger() {
    if (!globalLogger) {
        globalLogger = createSessionLogger("global");
    }
    return globalLogger;
}
//# sourceMappingURL=logger.js.map
import * as fs from "fs";
import * as path from "path";
function formatTimestamp() {
    return new Date().toISOString();
}
function formatLogEntry(level, component, message, data) {
    const timestamp = formatTimestamp();
    let entry = `[${timestamp}] [${level}] [${component}] ${message}`;
    if (data !== undefined) {
        entry += `\n  DATA: ${JSON.stringify(data, null, 2).split("\n").join("\n  ")}`;
    }
    return entry + "\n";
}
export function createSessionLogger(sessionId, logsDir) {
    const dir = logsDir || process.env.VECTORLESS_LOGS_DIR || "./vectorless-logs";
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const logPath = path.join(dir, `vectorless-${sessionId}.log`);
    // Write session start
    const startEntry = formatLogEntry("INFO", "SESSION", `=== Session ${sessionId} started ===`);
    fs.appendFileSync(logPath, startEntry);
    function writeLog(level, component, message, data) {
        const entry = formatLogEntry(level, component, message, data);
        fs.appendFileSync(logPath, entry);
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
            const entry = `[${timestamp}] [RAW] [${component}] ${label}\n--- BEGIN ---\n${content}\n--- END ---\n\n`;
            fs.appendFileSync(logPath, entry);
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
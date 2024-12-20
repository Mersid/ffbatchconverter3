import pc from "picocolors"
import { toCustomDateFormatMillis } from "./TimeFormatter";

export type LogLevel = "debug" | "info" | "warn" | "error";

export const log =  {
    log: logInternal,
    error,
    warn,
    info,
    debug,
    custom
}

function debug(message: string): void {
    logInternal("debug", message);
}

function info(message: string): void {
    logInternal("info", message);
}

function warn(message: string): void {
    logInternal("warn", message);
}

function error(message: string): void {
    logInternal("error", message);
}

function logInternal(logLevel: LogLevel, message: string): void {
    const date = new Date();
    const logMessageConsole = format(date, logLevel, message, true);

    const logFunction = () => {
        switch (logLevel) {
            case "debug":
                return console.debug;
            case "info":
                return console.info;
            case "warn":
                return console.warn;
            case "error":
                return console.error;
        }
    };

    logFunction()(logMessageConsole);
}

function format(date: Date, logLevel: LogLevel, message: string, color: boolean): string {
    // This function is used to color the log message based on the log level. If color is false,
    // we don't color the message. In this case, the function is the identity function.
    const severityColor = () => {
        if (!color) return (message: string) => message;

        switch (logLevel) {
            case "debug":
                return pc.blue;
            case "info":
                return pc.greenBright;
            case "warn":
                return pc.yellow;
            case "error":
                return pc.red;
        }
    };

    const timestampColor = color ? pc.green : (message: string) => message;

    const dateString = toCustomDateFormatMillis(date);

    // To make all the tags five characters (minus the [])
    const severityTag =`[${severityColor()(logLevel.toUpperCase())}]` + (["warn", "info"].includes(logLevel) ? " " : "");
    return `[${timestampColor(dateString)}] ${severityTag} ${message}`;
}

/**
 * Custom logging, for encoder text logs. Includes newline.
 */
function custom(tag: string, message: string): string {
    const date = new Date();
    const dateString = toCustomDateFormatMillis(date);

    return `[${dateString}] [${tag}] ${message}\n`;
}

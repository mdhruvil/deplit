import winston from "winston";

declare module "winston" {
  interface Logger {
    // since it is custom level, we need to declare it
    local: winston.LeveledLogMethod;
  }
}

const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
    local: 6,
  },
  colors: {
    fatal: "magenta",
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
    trace: "grey",
    local: "dim green",
  },
};
const notLocalFilter = winston.format((info) =>
  info.level === "local" ? false : info,
);

const jsonMessage = winston.format((info) => {
  if (typeof info.message === "object") {
    info.message = JSON.stringify(info.message, undefined, 2);
  }
  return info;
});

/**
 * format for logs which will be shown to user and stored in our backend
 */
const userLogFormat = winston.format.combine(
  notLocalFilter(),
  winston.format.errors({ stack: false }),
  winston.format.timestamp(),
  winston.format.json(),
);

/**
 * winston logger with custom `local` level
 * logs with `local` level will be logged to console but not shown to the user or saved to file
 */
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: "local",
  transports: [
    new winston.transports.Http({
      format: userLogFormat,
      port: process.env.DEPLIT_SIDECAR_PORT
        ? Number(process.env.DEPLIT_SIDECAR_PORT)
        : 9090,
      path: "/logs/ingest",
      auth: {
        bearer:
          process.env.DEPLIT_INTERNAL_SIDECAR_TOKEN ||
          (() => {
            console.error(
              "DEPLIT_INTERNAL_SIDECAR_TOKEN is not set, logging to HTTP will fail",
            );
            return "missing-token";
          })(),
      },
      batch: false,
      handleExceptions: true,
      handleRejections: true,
    }),

    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.ms" }),
        winston.format.errors({ stack: true }),
        jsonMessage(),
        winston.format.printf(
          ({ timestamp, level, message, stack, ...meta }) => {
            level = `[${level.toLocaleUpperCase()}]`;
            const logMessage = stack
              ? `${timestamp} ${level}: ${message} - ${stack}`
              : `${timestamp} ${level}: ${message}`;
            const metaString = Object.keys(meta).length
              ? ` ${JSON.stringify(meta, null, 2)}`
              : "";
            return logMessage + metaString;
          },
        ),
        winston.format.colorize({ colors: customLevels.colors, all: true }),
      ),
    }),
  ],
});

/**
 * Converts an object into a table-formatted string.
 * thank you chatgpt :)
 * @param obj Record where key and value are both strings
 * @param keyLabel Optional custom header for the 'key' column
 * @param valLabel Optional custom header for the 'value' column
 * @returns A multi-line string you can log
 */
export function makeTable(
  obj: Record<string, string>,
  keyLabel = "Key",
  valLabel = "Value",
): string {
  const entries = Object.entries(obj);
  const keyColWidth = Math.max(
    keyLabel.length,
    ...entries.map(([k]) => k.length),
  );
  const valColWidth = Math.max(
    valLabel.length,
    ...entries.map(([, v]) => v.length),
  );

  const pad = (s: string, width: number, alignLeft = true) =>
    alignLeft ? s.padEnd(width) : s.padStart(width);

  const sep = `+-${"-".repeat(keyColWidth)}-+-${"-".repeat(valColWidth)}-+`;

  const header = `| ${pad(keyLabel, keyColWidth)} | ${pad(valLabel, valColWidth)} |`;

  const rows = entries.map(
    ([k, v]) => `| ${pad(k, keyColWidth)} | ${pad(v, valColWidth)} |`,
  );

  return [sep, header, sep, ...rows, sep].join("\n");
}

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
const notInfoFilter = winston.format((info) =>
  info.level !== "local" ? info : false,
);

const jsonMessage = winston.format((info) => {
  try {
    info.message = JSON.stringify(info.message, undefined, 2);
    return info;
  } catch {
    return info;
  }
});

/**
 * winston logger with custom `local` level
 * logs with `local` level will be logged to console but not shown to the user or saved to file
 */
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: "local",
  transports: [
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
              ? ` ${JSON.stringify(meta)}`
              : "";
            return logMessage + metaString;
          },
        ),
        winston.format.colorize({ colors: customLevels.colors, all: true }),
      ),
    }),
    new winston.transports.File({
      filename: "logs/build.log",
      format: winston.format.combine(
        notInfoFilter(),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});
